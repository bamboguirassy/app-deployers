<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use App\Models\Subscription;
use App\Models\SubscriptionHistory;
use App\Models\Workspace;
use App\Services\PaddleSignatureVerifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PaddleWebhookController extends Controller
{
    public function __construct(private PaddleSignatureVerifier $verifier)
    {
    }

    public function handle(Request $request): JsonResponse
    {
        if (! $this->verifier->verify($request)) {
            return response()->json(['message' => 'Invalid signature.'], 401);
        }

        $payload = $request->json()->all();
        $eventType = $payload['event_type'] ?? null;
        $data = $payload['data'] ?? [];

        match ($eventType) {
            'subscription.created', 'subscription.updated' => $this->handleSubscriptionUpdated($data),
            'subscription.past_due' => $this->handleSubscriptionPastDue($data),
            'subscription.canceled' => $this->handleSubscriptionCanceled($data),
            'transaction.completed' => Log::info('Paddle transaction completed', ['transaction_id' => $data['id'] ?? null]),
            default => null,
        };

        return response()->json(['message' => 'ok']);
    }

    private function resolveSubscription(array $data): ?Subscription
    {
        $paddleSubscriptionId = $data['id'] ?? null;

        $subscription = Subscription::query()->where('paddle_subscription_id', $paddleSubscriptionId)->first();

        if ($subscription) {
            return $subscription;
        }

        $workspaceId = $data['custom_data']['workspace_id'] ?? null;
        $workspace = $workspaceId ? Workspace::find($workspaceId) : null;

        return $workspace?->subscription;
    }

    private function handleSubscriptionUpdated(array $data): void
    {
        $subscription = $this->resolveSubscription($data);

        if (! $subscription) {
            Log::warning('Paddle webhook: no matching subscription', ['paddle_subscription_id' => $data['id'] ?? null]);

            return;
        }

        $paddlePriceId = $data['items'][0]['price']['id'] ?? null;
        $plan = $paddlePriceId
            ? Plan::query()
                ->where('paddle_price_id_monthly', $paddlePriceId)
                ->orWhere('paddle_price_id_yearly', $paddlePriceId)
                ->first()
            : null;

        // "month"/"year" côté Paddle (billing_cycle.interval) -> notre
        // nomenclature interne (monthly/yearly, voir Plan::paddlePriceIdFor()).
        $paddleInterval = $data['billing_cycle']['interval'] ?? null;
        $interval = match ($paddleInterval) {
            'month' => 'monthly',
            'year' => 'yearly',
            default => $subscription->interval,
        };

        $subscription->update([
            'paddle_subscription_id' => $data['id'] ?? $subscription->paddle_subscription_id,
            'paddle_customer_id' => $data['customer_id'] ?? $subscription->paddle_customer_id,
            'plan_id' => $plan?->id ?? $subscription->plan_id,
            'status' => 'active',
            'interval' => $interval,
            'grace_period_ends_at' => null,
            'renews_at' => $data['next_billed_at'] ?? $subscription->renews_at,
        ]);

        $this->logHistory($subscription);
    }

    private function handleSubscriptionPastDue(array $data): void
    {
        $subscription = $this->resolveSubscription($data);

        if (! $subscription) {
            return;
        }

        $subscription->update([
            'status' => 'past_due',
            'grace_period_ends_at' => now()->addDays(config('paddle.grace_period_days')),
        ]);

        $this->logHistory($subscription);
    }

    private function handleSubscriptionCanceled(array $data): void
    {
        $subscription = $this->resolveSubscription($data);

        if (! $subscription) {
            return;
        }

        // Annulation volontaire : pas de grâce, retour immédiat au plan free
        // via Workspace::effectivePlan() (aucune autre action nécessaire ici).
        $subscription->update([
            'status' => 'canceled',
            'grace_period_ends_at' => null,
        ]);

        $this->logHistory($subscription);
    }

    /**
     * Historise la transition d'abonnement déclenchée par Paddle (source='webhook',
     * pas d'utilisateur associé) — pendant de SubscriptionHistory::create() côté
     * AdminSubscriptionController::update() (source='admin').
     */
    private function logHistory(Subscription $subscription): void
    {
        SubscriptionHistory::create([
            'workspace_id' => $subscription->workspace_id,
            'plan_id' => $subscription->plan_id,
            'status' => $subscription->status,
            'interval' => $subscription->interval,
            'changed_by_user_id' => null,
            'source' => 'webhook',
        ]);
    }
}
