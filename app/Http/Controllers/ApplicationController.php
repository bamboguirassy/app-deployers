<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\FiltersLists;
use App\Models\Application;
use App\Models\Deployment;
use App\Models\Framework;
use App\Models\Workspace;
use App\Services\ApplicationQuotaExceededException;
use App\Services\QuotaGuard;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ApplicationController extends Controller
{
    use FiltersLists;

    public function __construct(private QuotaGuard $quotaGuard)
    {
    }

    public function index(Workspace $workspace): Response
    {
        $applications = $workspace->visibleApplicationsFor(auth()->user())
            ->withCount(['targets', 'environments'])
            ->latest()
            ->paginate(12);

        return Inertia::render('Applications/Index', [
            'applications' => ['data' => $this->withLastDeployment($applications->items())],
            'kpis' => $this->applicationKpis($workspace->visibleApplicationsFor(auth()->user())->withCount(['targets', 'environments'])),
        ]);
    }

    /**
     * @param  array<int, Application>  $applications
     * @return array<int, array<string, mixed>>
     */
    private function withLastDeployment(array $applications): array
    {
        return array_map(function (Application $application) {
            $lastDeployment = Deployment::query()
                ->whereHas('targetEnvironment.target', fn ($q) => $q->where('application_id', $application->id))
                ->latest()
                ->first(['id', 'status', 'created_at']);

            return array_merge($application->toArray(), [
                'last_deployment_status' => $lastDeployment?->status,
                'last_deployment_at' => $lastDeployment?->created_at,
            ]);
        }, $applications);
    }

    private function applicationKpis($query): array
    {
        return [
            'total' => (clone $query)->count(),
            'without_targets' => (clone $query)->whereDoesntHave('targets')->count(),
            'with_recent_deployment' => (clone $query)->whereHas(
                'targets.targetEnvironments.deployments',
                fn ($q) => $q->where('deployments.created_at', '>=', now()->subDays(7)),
            )->count(),
        ];
    }

    public function search(Request $request, Workspace $workspace): JsonResponse
    {
        $data = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'sort' => ['nullable', 'in:name,created_at,targets_count'],
            'direction' => ['nullable', 'in:asc,desc'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $base = $workspace->visibleApplicationsFor(auth()->user())->withCount(['targets', 'environments']);

        $query = (clone $base);
        $this->applySearch($query, $data['search'] ?? null, ['applications.name', 'applications.description']);

        $kpis = $this->applicationKpis($query);

        $this->applySort($query, $data['sort'] ?? null, $data['direction'] ?? null, ['name', 'created_at', 'targets_count'], 'created_at');

        $applications = $query->paginate($this->perPage($data['per_page'] ?? null, 12));

        return response()->json([
            'data' => $this->withLastDeployment($applications->items()),
            'meta' => [
                'current_page' => $applications->currentPage(),
                'last_page' => $applications->lastPage(),
                'total' => $applications->total(),
                'per_page' => $applications->perPage(),
            ],
            'kpis' => $kpis,
        ]);
    }

    public function create(Workspace $workspace): Response
    {
        $this->authorize('create', Application::class);

        return Inertia::render('Applications/Create');
    }

    public function store(Request $request, Workspace $workspace): RedirectResponse
    {
        $this->authorize('create', Application::class);

        try {
            $this->quotaGuard->assertCanCreateApplication($workspace);
        } catch (ApplicationQuotaExceededException $e) {
            return back()->with('error', $e->getMessage());
        }

        $data = $request->validate([
            'name' => [
                'required', 'string', 'max:255',
                Rule::unique('applications', 'name')->where('workspace_id', $workspace->id),
            ],
            'description' => ['nullable', 'string', 'max:1000'],
            'logo' => ['nullable', 'image', 'max:2048'],
        ], [
            'name.unique' => 'Une application porte déjà ce nom dans ce workspace.',
        ]);

        $application = DB::transaction(function () use ($data, $request, $workspace) {
            $application = Application::create([
                'workspace_id' => $workspace->id,
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'created_by' => auth()->id(),
                'logo_path' => $request->hasFile('logo')
                    ? $request->file('logo')->store('application-logos', 'public')
                    : null,
            ]);

            // Le créateur n'est pas forcément le owner du workspace : lui garantir
            // l'accès à l'application qu'il vient de créer.
            $application->users()->syncWithoutDetaching([auth()->id()]);

            AuditLogger::log($application, 'application.created', $application);

            return $application;
        });

        return redirect()->route('applications.show', [$workspace->slug, $application->slug])
            ->with('status', 'Application créée.');
    }

    public function update(Request $request, Workspace $workspace, Application $application): RedirectResponse
    {
        abort_unless($application->belongsToWorkspace($workspace), 404);
        $this->authorize('update', $application);

        $data = $request->validate([
            'name' => [
                'required', 'string', 'max:255',
                Rule::unique('applications', 'name')->where('workspace_id', $workspace->id)->ignore($application->id),
            ],
            'description' => ['nullable', 'string', 'max:1000'],
            'logo' => ['nullable', 'image', 'max:2048'],
        ], [
            'name.unique' => 'Une application porte déjà ce nom dans ce workspace.',
        ]);

        unset($data['logo']);

        if ($request->hasFile('logo')) {
            if ($application->logo_path) {
                Storage::disk('public')->delete($application->logo_path);
            }

            $data['logo_path'] = $request->file('logo')->store('application-logos', 'public');
        }

        $application->update($data);

        AuditLogger::log($application, 'application.updated', $application);

        return back()->with('status', 'Application mise à jour.');
    }

    public function show(Workspace $workspace, Application $application): Response
    {
        abort_unless($application->belongsToWorkspace($workspace), 404);
        $this->authorize('view', $application);

        $application->load([
            'targets' => fn ($q) => $q->with(['framework', 'variables', 'pipelineSteps', 'webhookConfigs', 'targetEnvironments.environment', 'targetEnvironments.variables.targetVariable', 'targetEnvironments.server']),
            'environments',
        ]);

        $user = auth()->user();
        $members = $application->users()
            ->orderBy('users.name')
            ->get(['users.id', 'users.uuid', 'users.name', 'users.email'])
            ->map(fn ($member) => [
                'id' => $member->id,
                'uuid' => $member->uuid,
                'name' => $member->name,
                'email' => $member->email,
                'role' => $member->roleInWorkspace($workspace),
            ]);

        $deploymentsScope = fn ($q) => $q->whereHas('targetEnvironment.target', fn ($t) => $t->where('application_id', $application->id));

        $deployments = Deployment::query()->tap($deploymentsScope)
            ->with(['targetEnvironment.target', 'targetEnvironment.environment', 'triggeredBy'])
            ->latest()
            ->paginate(20)
            ->withQueryString();

        $membersKpis = ['total' => $members->count(), 'owner' => 0, 'manager' => 0, 'deployer' => 0, 'viewer' => 0];
        foreach ($members->countBy('role') as $role => $count) {
            if (array_key_exists($role, $membersKpis)) {
                $membersKpis[$role] = $count;
            }
        }

        $deploymentsKpisQuery = Deployment::query()->tap($deploymentsScope);
        $deploymentsSucces = (clone $deploymentsKpisQuery)->where('status', 'succes')->count();
        $deploymentsEchec = (clone $deploymentsKpisQuery)->where('status', 'echec')->count();
        $deploymentsFinished = $deploymentsSucces + $deploymentsEchec;

        // Utilisé pour peupler le sélecteur de destinataires d'un step "email" —
        // volontairement restreint aux membres actifs (non suspendus) ayant accès
        // à cette application, plutôt qu'à tout le workspace.
        $activeMembers = $application->users()
            ->whereNull('users.suspended_at')
            ->orderBy('users.name')
            ->get(['users.id', 'users.name', 'users.email']);

        return Inertia::render('Applications/Show', [
            'application' => $application,
            'members' => $members,
            'activeMembers' => $activeMembers,
            'membersKpis' => $membersKpis,
            'deployments' => ['data' => $deployments->items()],
            'deploymentsKpis' => [
                'total' => (clone $deploymentsKpisQuery)->count(),
                'running' => (clone $deploymentsKpisQuery)->whereIn('status', ['running', 'pending'])->count(),
                'succes' => $deploymentsSucces,
                'echec' => $deploymentsEchec,
                'success_rate' => $deploymentsFinished > 0 ? round(($deploymentsSucces / $deploymentsFinished) * 100) : 0,
                'avg_duration_ms' => (int) (clone $deploymentsKpisQuery)->whereNotNull('duration_ms')->avg('duration_ms'),
            ],
            'notificationSettings' => $application->getOrCreateNotificationSettings()->only('notify_on_start', 'notify_on_success', 'notify_on_failure'),
            'frameworks' => Framework::orderBy('order')->get(['id', 'name', 'slug', 'category', 'logo_url']),
            'servers' => $workspace->servers()->orderBy('name')->get(['id', 'uuid', 'name', 'host', 'port', 'username', 'auth_method', 'default_path']),
            'workspaceApplications' => $workspace->visibleApplicationsFor($user)
                ->orderBy('name')
                ->get(['id', 'name', 'slug', 'logo_path']),
            'can' => [
                'manageTargetsAndPipeline' => $user->can('manageTargetsAndPipeline', $application),
                'manageEnvironments' => $user->can('manageEnvironments', $application),
                'deploy' => $user->can('deploy', $application),
                'update' => $user->can('update', $application),
            ],
        ]);
    }

    public function destroy(Workspace $workspace, Application $application): RedirectResponse
    {
        abort_unless($application->belongsToWorkspace($workspace), 404);
        $this->authorize('delete', $application);

        $application->delete();

        return redirect()->route('applications.index', $workspace->slug)->with('status', 'Application supprimée.');
    }
}
