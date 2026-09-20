<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use App\Models\SubscriptionHistory;
use App\Models\Workspace;
use App\Services\PaddleClient;
use App\Services\PaddlePriceCatalog;
use App\Support\PlanCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BillingController extends Controller
{
    public function __construct(
        private PaddleClient $paddle,
        private PaddlePriceCatalog $prices,
    ) {}

    public function show(Workspace $workspace): Response
    {
        $this->authorize('viewBilling', $workspace);

        $subscription = $workspace->subscription;
        $plan = $workspace->effectivePlan();
        $freePlan = Plan::free();
        $proPlan = Plan::query()->where('slug', 'pro')->first();

        return Inertia::render('Billing/Show', [
            'plan' => PlanCatalog::present($plan),
            'usage' => [
                'applications' => $workspace->applications()->count(),
                'workspaces' => auth()->user()->workspaces()
                    ->get()
                    ->filter(fn ($ws) => auth()->user()->isWorkspaceOwner($ws))
                    ->count(),
            ],
            'subscription' => $subscription ? [
                'status' => $subscription->status,
                'is_comped' => $subscription->is_comped,
                'interval' => $subscription->interval,
                'grace_period_ends_at' => $subscription->grace_period_ends_at,
                'renews_at' => $subscription->renews_at,
            ] : null,
            'billingHistory' => $subscription
                ? SubscriptionHistory::query()
                    ->where('workspace_id', $workspace->id)
                    ->with('plan:id,name,slug')
                    ->latest()
                    ->limit(10)
                    ->get(['id', 'plan_id', 'status', 'interval', 'source', 'created_at'])
                    ->map(fn ($h) => [
                        'id' => $h->id,
                        'plan_name' => $h->plan?->name,
                        'plan_slug' => $h->plan?->slug,
                        'status' => $h->status,
                        'interval' => $h->interval,
                        'source' => $h->source,
                        'created_at' => $h->created_at,
                    ])
                : [],
            'freePlan' => PlanCatalog::present($freePlan),
            'proPlan' => $proPlan ? PlanCatalog::present($proPlan) + [
                'monthlyConfigured' => (bool) $proPlan->paddle_price_id_monthly,
                'yearlyConfigured' => (bool) $proPlan->paddle_price_id_yearly,
            ] : null,
            // Montants réellement configurés chez Paddle — jamais recopiés
            // dans le front (voir PaddlePriceCatalog).
            'prices' => $this->prices->proPrices(),
            'can' => [
                'manageBilling' => auth()->user()->can('manageBilling', $workspace),
            ],
            'paddle' => [
                'client_token' => config('paddle.client_token'),
                'sandbox' => config('paddle.sandbox'),
            ],
        ]);
    }

    public function checkout(Request $request, Workspace $workspace): JsonResponse
    {
        $this->authorize('manageBilling', $workspace);

        $data = $request->validate([
            'interval' => ['required', 'in:monthly,yearly'],
        ]);

        $proPlan = Plan::query()->where('slug', 'pro')->firstOrFail();
        $priceId = $proPlan->paddlePriceIdFor($data['interval']);

        abort_if(! $priceId, 422, "Le plan Pro ({$data['interval']}) n'est pas encore configuré côté facturation.");

        $transaction = $this->paddle->createTransaction($priceId, [
            'workspace_id' => (string) $workspace->id,
        ], route('billing.show', $workspace->slug));

        return response()->json(['transaction_id' => $transaction['id']]);
    }

    public function changeInterval(Request $request, Workspace $workspace): JsonResponse
    {
        $this->authorize('manageBilling', $workspace);

        $data = $request->validate([
            'interval' => ['required', 'in:monthly,yearly'],
        ]);

        $subscription = $workspace->subscription;

        abort_if(
            ! $subscription || $subscription->status !== 'active' || ! $subscription->paddle_subscription_id,
            422,
            "L'intervalle de facturation ne peut être changé que pour un abonnement Pro actif."
        );

        abort_if($subscription->interval === $data['interval'], 422, 'Le workspace est déjà sur cet intervalle de facturation.');

        $proPlan = Plan::query()->where('slug', 'pro')->firstOrFail();
        $priceId = $proPlan->paddlePriceIdFor($data['interval']);

        abort_if(! $priceId, 422, "Le plan Pro ({$data['interval']}) n'est pas encore configuré côté facturation.");

        $this->paddle->changeSubscriptionPrice($subscription->paddle_subscription_id, $priceId);

        return response()->json(['message' => 'ok']);
    }

    public function retryPayment(Workspace $workspace): JsonResponse
    {
        $this->authorize('manageBilling', $workspace);

        $subscription = $workspace->subscription;

        abort_if(! $subscription || $subscription->status !== 'past_due', 422, 'Aucun paiement en échec à régulariser pour ce workspace.');

        $transaction = $this->paddle->getUpdatePaymentMethodTransaction($subscription->paddle_subscription_id);

        return response()->json(['transaction_id' => $transaction['id']]);
    }
}
