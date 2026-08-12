<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use App\Support\PlatformAuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class AdminPlanController extends Controller
{
    public function index(): Response
    {
        $this->authorize('platform-admin.access');

        $plans = Plan::orderBy('id')->get();

        $usage = $this->usageByPlan($plans);

        return Inertia::render('Admin/Plans/Index', [
            'plans' => $plans->map(fn (Plan $plan) => [
                'id' => $plan->id,
                'slug' => $plan->slug,
                'name' => $plan->name,
                'max_applications' => $plan->max_applications,
                'max_concurrent_deployments' => $plan->max_concurrent_deployments,
                'workspaces_count' => $usage[$plan->id]['workspaces_count'] ?? 0,
                'max_applications_in_use' => $usage[$plan->id]['max_applications_in_use'] ?? 0,
            ])->values(),
        ]);
    }

    /**
     * Calcule, en 2 requêtes agrégées au total (indépendamment du nombre de
     * plans), pour chaque plan : le nombre de workspaces effectivement dessus
     * et le nombre max d'applications détenues par un seul de ces workspaces.
     *
     * "Effectivement sur le plan" réplique exactement la logique de
     * Workspace::effectivePlan() : un workspace sans abonnement, ou dont
     * l'abonnement n'est ni actif ni en grâce (échec de paiement), retombe
     * silencieusement sur le plan free — il ne suffit donc pas de filtrer sur
     * subscriptions.plan_id = free.id, il faut aussi compter les workspaces
     * sans ligne d'abonnement ou avec un abonnement inactif/hors grâce.
     */
    private function usageByPlan($plans): array
    {
        $freePlanId = $plans->firstWhere('slug', 'free')?->id;

        // Une ligne par workspace avec le plan_id "effectif" calculé en SQL,
        // en répliquant Workspace::effectivePlan() (actif, ou past_due encore
        // dans sa période de grâce => plan de l'abonnement ; sinon => free).
        $workspacePlans = DB::table('workspaces')
            ->leftJoin('subscriptions', 'subscriptions.workspace_id', '=', 'workspaces.id')
            ->selectRaw(
                'workspaces.id as workspace_id, CASE
                    WHEN subscriptions.id IS NOT NULL AND (
                        subscriptions.status = ?
                        OR (subscriptions.status = ? AND subscriptions.grace_period_ends_at IS NOT NULL AND subscriptions.grace_period_ends_at > ?)
                    ) THEN subscriptions.plan_id
                    ELSE ?
                END as effective_plan_id',
                ['active', 'past_due', now(), $freePlanId]
            )
            ->get();

        $applicationCountsByWorkspace = DB::table('applications')
            ->selectRaw('workspace_id, count(*) as c')
            ->groupBy('workspace_id')
            ->pluck('c', 'workspace_id');

        $usage = [];

        foreach ($workspacePlans->groupBy('effective_plan_id') as $planId => $rows) {
            $maxApplications = $rows->map(
                fn ($row) => (int) ($applicationCountsByWorkspace[$row->workspace_id] ?? 0)
            )->max() ?? 0;

            $usage[$planId] = [
                'workspaces_count' => $rows->count(),
                'max_applications_in_use' => $maxApplications,
            ];
        }

        return $usage;
    }

    public function update(Request $request, Plan $plan): RedirectResponse
    {
        $this->authorize('platform-admin.managePlans');

        $data = $request->validate([
            'max_applications' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'max_concurrent_deployments' => ['sometimes', 'nullable', 'integer', 'min:0'],
        ]);

        $before = $plan->only(['max_applications', 'max_concurrent_deployments']);

        $plan->fill($data);
        $plan->save();

        PlatformAuditLogger::log('plan.update', $plan, [
            'before' => $before,
            'after' => $plan->only(['max_applications', 'max_concurrent_deployments']),
        ]);

        return back()->with('status', "Les limites du plan {$plan->name} ont été mises à jour.");
    }
}
