<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use App\Models\SubscriptionHistory;
use App\Models\Workspace;
use App\Services\PaddleClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BillingController extends Controller
{
    public function __construct(private PaddleClient $paddle) {}

    public function show(Workspace $workspace): Response
    {
        $this->authorize('viewBilling', $workspace);

        $subscription = $workspace->subscription;
        $plan = $workspace->effectivePlan();
        $freePlan = Plan::free();
        $proPlan = Plan::query()->where('slug', 'pro')->first();

        return Inertia::render('Billing/Show', [
            'plan' => [
                'slug' => $plan->slug,
                'name' => $plan->name,
                'max_applications' => $plan->max_applications,
                'max_concurrent_deployments' => $plan->max_concurrent_deployments,
                'max_workspaces' => $plan->max_workspaces,
            ],
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
            'freePlan' => [
                'slug' => $freePlan->slug,
                'name' => $freePlan->name,
                'max_applications' => $freePlan->max_applications,
                'max_concurrent_deployments' => $freePlan->max_concurrent_deployments,
                'max_workspaces' => $freePlan->max_workspaces,
            ],
            'proPlan' => $proPlan ? [
                'slug' => $proPlan->slug,
                'name' => $proPlan->name,
                'max_applications' => $proPlan->max_applications,
                'max_concurrent_deployments' => $proPlan->max_concurrent_deployments,
                'max_workspaces' => $proPlan->max_workspaces,
                'monthlyConfigured' => (bool) $proPlan->paddle_price_id_monthly,
                'yearlyConfigured' => (bool) $proPlan->paddle_price_id_yearly,
            ] : null,
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
}
