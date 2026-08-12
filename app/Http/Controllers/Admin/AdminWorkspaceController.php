<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Concerns\FiltersLists;
use App\Http\Controllers\Controller;
use App\Models\Application;
use App\Models\Deployment;
use App\Models\Plan;
use App\Models\User;
use App\Models\Workspace;
use App\Support\PlatformAuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class AdminWorkspaceController extends Controller
{
    use FiltersLists;

    private function baseQuery()
    {
        // Nombre de membres calculé via une sous-requête (comptage distinct sur
        // model_has_roles scopé par workspace) plutôt que Workspace::members()
        // (méthode retournant une collection, pas une relation Eloquent) pour
        // éviter un N+1 sur la liste paginée.
        $membersCountSub = DB::table('model_has_roles')
            ->selectRaw('count(distinct model_has_roles.model_id)')
            ->where('model_has_roles.model_type', User::class)
            ->whereColumn('model_has_roles.workspace_id', 'workspaces.id');

        // Owner "principal" (le plus ancien) + nombre total d'owners, calculés en
        // sous-requêtes scalaires corrélées (pas de jointure multipliant les
        // lignes du workspace) pour éviter un N+1 sur la liste paginée.
        $ownerJoin = fn () => DB::table('model_has_roles')
            ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
            ->join('users', 'users.id', '=', 'model_has_roles.model_id')
            ->where('model_has_roles.model_type', User::class)
            ->where('roles.name', 'owner')
            ->whereColumn('model_has_roles.workspace_id', 'workspaces.id');

        // model_has_roles est un pivot Spatie sans clé primaire propre / colonne
        // created_at ; on approxime "le plus ancien owner" par le plus petit
        // model_id (users.id), l'ordre de création des comptes.
        $primaryOwnerNameSub = $ownerJoin()->orderBy('model_has_roles.model_id')->select('users.name')->limit(1);
        $primaryOwnerEmailSub = $ownerJoin()->orderBy('model_has_roles.model_id')->select('users.email')->limit(1);

        $ownerCountSub = DB::table('model_has_roles')
            ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
            ->selectRaw('count(distinct model_has_roles.model_id)')
            ->where('model_has_roles.model_type', User::class)
            ->where('roles.name', 'owner')
            ->whereColumn('model_has_roles.workspace_id', 'workspaces.id');

        return Workspace::query()
            ->select('workspaces.*')
            ->selectSub($membersCountSub, 'members_count')
            ->selectSub($primaryOwnerNameSub, 'owner_name')
            ->selectSub($primaryOwnerEmailSub, 'owner_email')
            ->selectSub($ownerCountSub, 'owner_count')
            ->withCount('applications')
            ->with([
                'subscription.plan',
                'latestApplication' => fn ($q) => $q->select('applications.id', 'applications.workspace_id', 'applications.name', 'applications.logo_path'),
            ]);
    }

    public function index(): Response
    {
        $this->authorize('platform-admin.access');

        $workspaces = $this->baseQuery()->latest()->paginate(20);

        return Inertia::render('Admin/Workspaces/List', [
            'workspaces' => ['data' => $workspaces->items()],
            'kpis' => $this->kpis(),
        ]);
    }

    private function kpis(): array
    {
        return [
            'total' => Workspace::count(),
            'suspended' => Workspace::whereNotNull('suspended_at')->count(),
            'active_subscriptions' => Workspace::whereHas('subscription', fn ($q) => $q->where('status', 'active'))->count(),
        ];
    }

    public function search(Request $request): JsonResponse
    {
        $this->authorize('platform-admin.access');

        $data = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'in:active,suspended'],
            'sort' => ['nullable', 'in:name,created_at,applications_count'],
            'direction' => ['nullable', 'in:asc,desc'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $query = $this->baseQuery();
        $this->applySearch($query, $data['search'] ?? null, ['workspaces.name', 'workspaces.slug']);

        if (($data['status'] ?? null) === 'suspended') {
            $query->whereNotNull('suspended_at');
        } elseif (($data['status'] ?? null) === 'active') {
            $query->whereNull('suspended_at');
        }

        $this->applySort($query, $data['sort'] ?? null, $data['direction'] ?? null, ['name', 'created_at', 'applications_count'], 'created_at');

        $workspaces = $query->paginate($this->perPage($data['per_page'] ?? null, 20));

        return response()->json([
            'data' => $workspaces->items(),
            'meta' => [
                'current_page' => $workspaces->currentPage(),
                'last_page' => $workspaces->lastPage(),
                'total' => $workspaces->total(),
                'per_page' => $workspaces->perPage(),
            ],
            'kpis' => $this->kpis(),
        ]);
    }

    public function show(Workspace $workspace): Response
    {
        $this->authorize('platform-admin.access');

        $workspace->load(['subscription.plan', 'creator:id,name,email']);

        $members = $workspace->members();

        $applications = $workspace->applications()->get(['id', 'uuid', 'workspace_id', 'name', 'slug', 'logo_path']);
        $appIds = $applications->pluck('id');

        return Inertia::render('Admin/Workspaces/Show', [
            'workspace' => $workspace,
            'members' => $members,
            'owners' => $members->where('role', 'owner')->values(),
            'applications' => $this->applicationsWithDeploymentStats($workspace, $applications, $appIds),
            'subscriptionHistory' => $workspace->subscriptionHistory()->with(['plan:id,name', 'changedBy:id,name'])->limit(50)->get(),
            'plans' => Plan::orderBy('name')->get(['id', 'slug', 'name']),
        ]);
    }

    /**
     * Construit, pour chaque application du workspace, ses statistiques de
     * déploiement (total, échecs, taux d'échec, dernier déploiement) et ses
     * quelques derniers déploiements en échec avec le détail de l'étape fautive.
     * Deux requêtes agrégées au total (peu importe le nombre d'applications),
     * pas de boucle N+1.
     */
    private function applicationsWithDeploymentStats(Workspace $workspace, $applications, $appIds): array
    {
        if ($appIds->isEmpty()) {
            return [];
        }

        $stats = DB::table('deployments')
            ->join('target_environments', 'target_environments.id', '=', 'deployments.target_environment_id')
            ->join('targets', 'targets.id', '=', 'target_environments.target_id')
            ->whereIn('targets.application_id', $appIds)
            ->selectRaw('targets.application_id, count(*) as total, sum(case when deployments.status = ? then 1 else 0 end) as failed, max(deployments.created_at) as last_deployment_at', ['echec'])
            ->groupBy('targets.application_id')
            ->get()
            ->keyBy('application_id');

        $recentFailed = Deployment::query()
            ->where('status', 'echec')
            ->whereHas('targetEnvironment.target', fn ($q) => $q->whereIn('application_id', $appIds))
            ->with([
                'targetEnvironment.target:id,application_id,name',
                'targetEnvironment.environment:id,name',
                'steps' => fn ($q) => $q->where('status', 'echec')->orderByDesc('id')->limit(1),
            ])
            ->latest()
            ->limit(100)
            ->get()
            ->groupBy(fn (Deployment $deployment) => $deployment->targetEnvironment->target->application_id);

        return $applications->map(function (Application $application) use ($workspace, $stats, $recentFailed) {
            $stat = $stats->get($application->id);
            $total = (int) ($stat->total ?? 0);
            $failed = (int) ($stat->failed ?? 0);

            $failedDeployments = ($recentFailed->get($application->id) ?? collect())
                ->take(5)
                ->map(function (Deployment $deployment) use ($workspace, $application) {
                    $failedStep = $deployment->steps->first();

                    return [
                        'id' => $deployment->id,
                        'uuid' => $deployment->uuid,
                        'created_at' => $deployment->created_at,
                        'target_name' => $deployment->targetEnvironment?->target?->name,
                        'environment_name' => $deployment->targetEnvironment?->environment?->name,
                        'failed_step' => $failedStep ? [
                            'label' => $failedStep->label_snapshot,
                            'exit_code' => $failedStep->exit_code,
                            'output_excerpt' => $failedStep->output ? Str::limit($failedStep->output, 300) : null,
                        ] : null,
                        'show_url' => route('deployments.show', [$workspace, $application, $deployment]),
                    ];
                })
                ->values();

            return [
                'id' => $application->id,
                'uuid' => $application->uuid,
                'name' => $application->name,
                'slug' => $application->slug,
                'logo_url' => $application->logo_url,
                'deployments_total' => $total,
                'deployments_failed' => $failed,
                'failure_rate' => $total > 0 ? round($failed / $total * 100, 1) : 0,
                'last_deployment_at' => $stat->last_deployment_at ?? null,
                'recent_failed_deployments' => $failedDeployments,
            ];
        })->values()->all();
    }

    public function suspend(Workspace $workspace): RedirectResponse
    {
        $this->authorize('platform-admin.manageWorkspaces');

        $workspace->update(['suspended_at' => now()]);

        PlatformAuditLogger::log('workspace.suspend', $workspace, ['suspended_at' => $workspace->suspended_at]);

        return back()->with('status', "Le workspace {$workspace->name} a été suspendu.");
    }

    public function reactivate(Workspace $workspace): RedirectResponse
    {
        $this->authorize('platform-admin.manageWorkspaces');

        $workspace->update(['suspended_at' => null]);

        PlatformAuditLogger::log('workspace.reactivate', $workspace);

        return back()->with('status', "Le workspace {$workspace->name} a été réactivé.");
    }
}
