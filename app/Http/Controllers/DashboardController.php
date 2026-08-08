<?php

namespace App\Http\Controllers;

use App\Models\Application;
use App\Models\Deployment;
use App\Models\Environment;
use App\Models\Target;
use App\Models\Workspace;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Workspace $workspace): Response
    {
        $applications = $workspace->visibleApplicationsFor(auth()->user());
        $applicationIds = (clone $applications)->pluck('applications.id');

        $deploymentsBase = fn () => Deployment::query()
            ->whereHas('targetEnvironment.target', fn ($q) => $q->whereIn('application_id', $applicationIds));

        $now = now();
        $periodStart = $now->copy()->subDays(30);
        $priorStart = $now->copy()->subDays(60);

        $last30d = $deploymentsBase()->where('deployments.created_at', '>=', $periodStart);
        $succes = (clone $last30d)->where('status', 'succes')->count();
        $echec = (clone $last30d)->where('status', 'echec')->count();
        $finished = $succes + $echec;

        $statusBreakdown = (clone $last30d)
            ->select('status', DB::raw('count(*) as aggregate'))
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        $deploymentsNow30 = (clone $last30d)->count();

        $stats = [
            'applications' => (clone $applications)->count(),
            'targets' => Target::whereIn('application_id', $applicationIds)->count(),
            'environments' => Environment::whereIn('application_id', $applicationIds)->count(),
            'deployments_30d' => $deploymentsNow30,
            'success_rate_30d' => $finished > 0 ? (int) round($succes / $finished * 100) : null,
            'running' => $deploymentsBase()->whereIn('status', ['running', 'pending'])->count(),
        ];

        // Tendances : comparaison avec la période précédente (30-60 jours), sans donnée inventée.
        $deploymentsPrior30 = $deploymentsBase()->whereBetween('deployments.created_at', [$priorStart, $periodStart])->count();
        $deploymentsTrendPct = $deploymentsPrior30 > 0
            ? (int) round((($deploymentsNow30 - $deploymentsPrior30) / $deploymentsPrior30) * 100)
            : ($deploymentsNow30 > 0 ? 100 : 0);

        $priorPeriod = $deploymentsBase()->whereBetween('deployments.created_at', [$priorStart, $periodStart]);
        $priorSucces = (clone $priorPeriod)->where('status', 'succes')->count();
        $priorEchec = (clone $priorPeriod)->where('status', 'echec')->count();
        $priorFinished = $priorSucces + $priorEchec;
        $priorRate = $priorFinished > 0 ? (int) round($priorSucces / $priorFinished * 100) : null;
        $successRateTrend = ($stats['success_rate_30d'] !== null && $priorRate !== null)
            ? $stats['success_rate_30d'] - $priorRate
            : null;

        $trends = [
            'applications' => ['type' => 'count', 'value' => (clone $applications)->where('applications.created_at', '>=', $periodStart)->count()],
            'targets' => ['type' => 'count', 'value' => Target::whereIn('application_id', $applicationIds)->where('created_at', '>=', $periodStart)->count()],
            'environments' => ['type' => 'count', 'value' => Environment::whereIn('application_id', $applicationIds)->where('created_at', '>=', $periodStart)->count()],
            'deployments_30d' => ['type' => 'percent', 'value' => $deploymentsTrendPct],
            'running' => null,
            'success_rate_30d' => $successRateTrend !== null ? ['type' => 'percent_point', 'value' => $successRateTrend] : null,
        ];

        $recentDeployments = $deploymentsBase()
            ->with(['targetEnvironment.target.application', 'targetEnvironment.environment', 'triggeredBy'])
            ->latest()
            ->limit(8)
            ->get();

        $applicationsOverview = (clone $applications)
            ->withCount(['targets', 'environments'])
            ->latest()
            ->limit(8)
            ->get()
            ->map(function (Application $application) {
                $lastDeployment = Deployment::whereHas(
                    'targetEnvironment.target',
                    fn ($q) => $q->where('application_id', $application->id),
                )->latest()->first(['id', 'status', 'created_at']);

                return [
                    'id' => $application->id,
                    'name' => $application->name,
                    'slug' => $application->slug,
                    'description' => $application->description,
                    'logo_url' => $application->logo_url,
                    'targets_count' => $application->targets_count,
                    'environments_count' => $application->environments_count,
                    'last_deployment_status' => $lastDeployment?->status,
                    'last_deployment_at' => $lastDeployment?->created_at,
                ];
            });

        return Inertia::render('Dashboard', [
            'stats' => $stats,
            'trends' => $trends,
            'statusBreakdown' => [
                'pending' => (int) ($statusBreakdown['pending'] ?? 0),
                'running' => (int) ($statusBreakdown['running'] ?? 0),
                'succes' => (int) ($statusBreakdown['succes'] ?? 0),
                'echec' => (int) ($statusBreakdown['echec'] ?? 0),
                'annule' => (int) ($statusBreakdown['annule'] ?? 0),
            ],
            'recentDeployments' => $recentDeployments,
            'applications' => $applicationsOverview,
        ]);
    }
}
