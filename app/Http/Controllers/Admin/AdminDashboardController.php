<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Deployment;
use App\Models\Plan;
use App\Models\Workspace;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class AdminDashboardController extends Controller
{
    public function index(): Response
    {
        $this->authorize('platform-admin.access');

        $totalWorkspaces = Workspace::count();

        $activeWorkspaces = Workspace::whereHas('subscription', function ($q) {
            $q->where('status', 'active')
                ->orWhere(function ($q2) {
                    $q2->where('status', 'past_due')->where('grace_period_ends_at', '>', now());
                });
        })->count();

        // Le modèle Plan n'a pas de colonne de prix (paddle_price_id_monthly/yearly
        // seulement, pas de montant en base) : impossible de calculer un MRR réel
        // sans inventer un chiffre. On affiche donc une répartition des workspaces
        // par plan à la place d'un MRR fictif.
        $planDistribution = Workspace::query()
            ->join('subscriptions', 'subscriptions.workspace_id', '=', 'workspaces.id')
            ->join('plans', 'plans.id', '=', 'subscriptions.plan_id')
            ->select('plans.name as plan_name', DB::raw('count(*) as total'))
            ->groupBy('plans.name')
            ->orderByDesc('total')
            ->get();

        $deploymentsLast24h = Deployment::where('created_at', '>=', now()->subDay())->count();
        $failedDeploymentsLast24h = Deployment::where('created_at', '>=', now()->subDay())
            ->where('status', 'echec')
            ->count();

        $failedJobsCount = DB::table('failed_jobs')->count();

        $topWorkspaces = Workspace::query()
            ->select('workspaces.id', 'workspaces.name', 'workspaces.slug', DB::raw('count(deployments.id) as deployments_count'))
            ->join('applications', 'applications.workspace_id', '=', 'workspaces.id')
            ->join('targets', 'targets.application_id', '=', 'applications.id')
            ->join('target_environments', 'target_environments.target_id', '=', 'targets.id')
            ->join('deployments', 'deployments.target_environment_id', '=', 'target_environments.id')
            ->groupBy('workspaces.id', 'workspaces.name', 'workspaces.slug')
            ->orderByDesc('deployments_count')
            ->limit(5)
            ->get();

        return Inertia::render('Admin/Dashboard', [
            'kpis' => [
                'total_workspaces' => $totalWorkspaces,
                'active_workspaces' => $activeWorkspaces,
                'deployments_24h' => $deploymentsLast24h,
                'failed_deployments_24h' => $failedDeploymentsLast24h,
                'failed_jobs' => $failedJobsCount,
            ],
            'planDistribution' => $planDistribution,
            'topWorkspaces' => $topWorkspaces,
        ]);
    }
}
