<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\FiltersLists;
use App\Jobs\RunDeploymentJob;
use App\Models\Application;
use App\Models\Deployment;
use App\Models\Environment;
use App\Models\TargetEnvironment;
use App\Models\Workspace;
use App\Services\DeploymentAlreadyRunningException;
use App\Services\DeploymentService;
use App\Services\MissingEnvironmentVariablesException;
use App\Services\TargetEnvironmentMissingServerException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class DeploymentController extends Controller
{
    use FiltersLists;

    public function __construct(private DeploymentService $deployments) {}

    private function deploymentKpis($query): array
    {
        $kpisBase = clone $query;
        $kpis = [
            'total' => (clone $kpisBase)->count(),
            'running' => (clone $kpisBase)->whereIn('status', ['running', 'pending'])->count(),
            'succes' => (clone $kpisBase)->where('status', 'succes')->count(),
            'echec' => (clone $kpisBase)->where('status', 'echec')->count(),
            'success_rate' => 0,
            'avg_duration_ms' => (int) (clone $kpisBase)->whereNotNull('duration_ms')->avg('duration_ms'),
        ];
        $finished = $kpis['succes'] + $kpis['echec'];
        $kpis['success_rate'] = $finished > 0 ? round(($kpis['succes'] / $finished) * 100) : 0;

        return $kpis;
    }

    public function indexAll(Workspace $workspace): Response
    {
        $visibleApplications = $workspace->visibleApplicationsFor(auth()->user());
        $applicationIds = $visibleApplications->pluck('applications.id');

        $scope = fn (Builder $q) => $q->whereHas('targetEnvironment.target', fn ($t) => $t->whereIn('application_id', $applicationIds));

        $deployments = Deployment::query()->tap($scope)
            ->with(['targetEnvironment.target.application', 'targetEnvironment.environment', 'triggeredBy'])
            ->latest()
            ->paginate(20);

        return Inertia::render('Deployments/All', [
            'deployments' => ['data' => $deployments->items()],
            'kpis' => $this->deploymentKpis(Deployment::query()->tap($scope)),
            'can' => ['deploy' => auth()->user()->can('deployments.trigger')],
            'deployableApplications' => auth()->user()->can('deployments.trigger')
                ? $visibleApplications
                    ->with(['targets.targetEnvironments.environment'])
                    ->get(['applications.id', 'applications.name', 'applications.slug'])
                : [],
        ]);
    }

    public function index(Workspace $workspace, Application $application): Response
    {
        $this->authorize('deploy', $application);

        $scope = fn (Builder $q) => $q->whereHas('targetEnvironment.target', fn ($t) => $t->where('application_id', $application->id));

        $deployments = Deployment::query()->tap($scope)
            ->with(['targetEnvironment.target', 'targetEnvironment.environment', 'triggeredBy'])
            ->latest()
            ->paginate(20);

        return Inertia::render('Deployments/Index', [
            'application' => $application,
            'deployments' => ['data' => $deployments->items()],
            'kpis' => $this->deploymentKpis(Deployment::query()->tap($scope)),
        ]);
    }

    public function searchAll(Request $request, Workspace $workspace): JsonResponse
    {
        $applicationIds = $workspace->visibleApplicationsFor(auth()->user())->pluck('applications.id');

        return $this->runSearch(
            $request,
            fn (Builder $q) => $q->whereHas('targetEnvironment.target', fn ($t) => $t->whereIn('application_id', $applicationIds)),
            ['targetEnvironment.target.application', 'targetEnvironment.environment', 'triggeredBy'],
            withApplicationFilter: true,
        );
    }

    public function search(Request $request, Workspace $workspace, Application $application): JsonResponse
    {
        $this->authorize('deploy', $application);

        return $this->runSearch(
            $request,
            fn (Builder $q) => $q->whereHas('targetEnvironment.target', fn ($t) => $t->where('application_id', $application->id)),
            ['targetEnvironment.target', 'targetEnvironment.environment', 'triggeredBy'],
            withApplicationFilter: false,
        );
    }

    private function runSearch(Request $request, \Closure $scope, array $with, bool $withApplicationFilter): JsonResponse
    {
        $rules = [
            'search' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'in:pending,running,succes,echec,annule'],
            'trigger_source' => ['nullable', 'in:manual,webhook,scheduled'],
            'target_id' => ['nullable', 'integer'],
            'environment_id' => ['nullable', 'integer'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date'],
            'sort' => ['nullable', 'in:created_at,started_at,finished_at,duration_ms,status'],
            'direction' => ['nullable', 'in:asc,desc'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ];

        if ($withApplicationFilter) {
            $rules['application_id'] = ['nullable', 'integer'];
        }

        $data = $request->validate($rules);

        $base = Deployment::query()->tap($scope);

        $query = (clone $base);
        $this->applySearch($query, $data['search'] ?? null, ['deployments.branch', 'deployments.commit_sha']);

        if (! empty($data['status'])) {
            $query->where('status', $data['status']);
        }
        if (! empty($data['trigger_source'])) {
            $query->where('trigger_source', $data['trigger_source']);
        }
        if (! empty($data['target_id'])) {
            $query->whereHas('targetEnvironment', fn ($q) => $q->where('target_id', $data['target_id']));
        }
        if (! empty($data['environment_id'])) {
            $query->whereHas('targetEnvironment', fn ($q) => $q->where('environment_id', $data['environment_id']));
        }
        if ($withApplicationFilter && ! empty($data['application_id'])) {
            $query->whereHas('targetEnvironment.target', fn ($q) => $q->where('application_id', $data['application_id']));
        }
        if (! empty($data['date_from'])) {
            $query->whereDate('created_at', '>=', $data['date_from']);
        }
        if (! empty($data['date_to'])) {
            $query->whereDate('created_at', '<=', $data['date_to']);
        }

        $kpis = $this->deploymentKpis($query);

        $this->applySort($query, $data['sort'] ?? null, $data['direction'] ?? null, ['created_at', 'started_at', 'finished_at', 'duration_ms', 'status'], 'created_at');

        $deployments = $query->with($with)->paginate($this->perPage($data['per_page'] ?? null, 20));

        return response()->json([
            'data' => $deployments->items(),
            'meta' => [
                'current_page' => $deployments->currentPage(),
                'last_page' => $deployments->lastPage(),
                'total' => $deployments->total(),
                'per_page' => $deployments->perPage(),
            ],
            'kpis' => $kpis,
        ]);
    }

    public function store(Workspace $workspace, Application $application, TargetEnvironment $targetEnvironment): RedirectResponse
    {
        $this->authorize('deploy', $application);
        abort_unless($targetEnvironment->belongsToWorkspace($workspace), 404);

        try {
            $this->deployments->trigger(
                $targetEnvironment,
                source: 'manual',
                user: auth()->user(),
            );
        } catch (DeploymentAlreadyRunningException|TargetEnvironmentMissingServerException|MissingEnvironmentVariablesException $e) {
            return back()->with('error', $e->getMessage());
        }

        // Reste sur la page d'origine plutôt que de forcer une navigation vers
        // le détail — le badge "déploiements en cours" (sidebar) et les listes
        // en direct donnent déjà la visibilité nécessaire sans quitter le
        // contexte (pipeline, matrice d'environnements...) depuis lequel le
        // déploiement a été lancé.
        return back()->with('status', 'Déploiement lancé.');
    }

    /**
     * Déclenche un déploiement pour chaque target configuré sur cet
     * environnement, en parallèle (une file d'attente par target — pas un
     * déploiement combiné unique, le modèle de données reste un déploiement =
     * un couple target/environnement).
     */
    public function storeForEnvironment(Workspace $workspace, Application $application, Environment $environment): RedirectResponse
    {
        $this->authorize('deploy', $application);
        abort_unless($environment->belongsToWorkspace($workspace), 404);

        $targetEnvironments = TargetEnvironment::query()
            ->whereHas('target', fn ($q) => $q->where('application_id', $application->id))
            ->where('environment_id', $environment->id)
            ->with('target')
            ->get();

        abort_if($targetEnvironments->isEmpty(), 404);

        $triggered = 0;
        $skipped = [];
        $missingServer = [];

        foreach ($targetEnvironments as $targetEnvironment) {
            try {
                $this->deployments->trigger($targetEnvironment, source: 'manual', user: auth()->user());
                $triggered++;
            } catch (DeploymentAlreadyRunningException) {
                $skipped[] = $targetEnvironment->target->name;
            } catch (TargetEnvironmentMissingServerException|MissingEnvironmentVariablesException) {
                $missingServer[] = $targetEnvironment->target->name;
            }
        }

        // Pas de limite de concurrence à signaler ici : un déploiement sans
        // slot disponible n'est jamais rejeté, il patiente en file d'attente
        // ("pending") jusqu'à ce qu'un slot se libère (RunDeploymentJob).
        $message = "{$triggered} déploiement(s) lancé(s) sur {$environment->name}.";
        if (! empty($skipped)) {
            $message .= ' Déjà en cours, ignoré(s) : '.implode(', ', $skipped).'.';
        }
        if (! empty($missingServer)) {
            $message .= ' Sans serveur configuré, ignoré(s) : '.implode(', ', $missingServer).'.';
        }

        return back()->with($triggered > 0 ? 'status' : 'error', $message);
    }

    public function show(Workspace $workspace, Application $application, Deployment $deployment): Response
    {
        $this->authorize('deploy', $application);
        abort_unless($deployment->belongsToWorkspace($workspace), 404);

        $deployment->load(['steps', 'targetEnvironment.target', 'targetEnvironment.environment', 'triggeredBy']);

        return Inertia::render('Deployments/Show', [
            'application' => $application,
            'deployment' => $deployment,
        ]);
    }

    public function cancel(Workspace $workspace, Application $application, Deployment $deployment): RedirectResponse
    {
        $this->authorize('deploy', $application);
        abort_unless($deployment->belongsToWorkspace($workspace), 404);

        if (in_array($deployment->status, ['running', 'pending'], true)) {
            Cache::put(RunDeploymentJob::cancelKey($deployment->id), true, now()->addMinutes(20));
            $deployment->update(['cancelled_by_user_id' => auth()->id()]);
        }

        return back()->with('status', 'Annulation demandée.');
    }

    /**
     * Relance un nouveau déploiement sur le même couple target/environnement,
     * en reprenant la branche et le commit du déploiement d'origine — pas une
     * reprise du déploiement existant (l'historique de celui-ci reste figé),
     * juste un raccourci pour éviter de ressaisir la config depuis la liste.
     */
    public function retry(Workspace $workspace, Application $application, Deployment $deployment): RedirectResponse
    {
        $this->authorize('deploy', $application);
        abort_unless($deployment->belongsToWorkspace($workspace), 404);

        if (! in_array($deployment->status, ['echec', 'annule'], true)) {
            return back()->with('error', 'Seul un déploiement en échec ou annulé peut être relancé.');
        }

        try {
            $retried = $this->deployments->trigger(
                $deployment->targetEnvironment,
                source: 'manual',
                user: auth()->user(),
                commitSha: $deployment->commit_sha,
                branch: $deployment->branch,
            );
        } catch (DeploymentAlreadyRunningException|TargetEnvironmentMissingServerException|MissingEnvironmentVariablesException $e) {
            return back()->with('error', $e->getMessage());
        }

        return redirect()->route('deployments.show', [$workspace->slug, $application->slug, $retried->uuid]);
    }

    /**
     * Revient à une version connue-bonne : redéploie la branche/commit d'un
     * déploiement passé en succès sur le même target/environnement. À la
     * différence de retry() (qui relance un échec/annulation avec la même
     * config), le rollback part toujours d'un déploiement qui a réussi —
     * c'est un raccourci pour "reviens à ce qui marchait avant", pas une
     * reprise de l'historique existant (qui reste figé).
     */
    public function rollback(Workspace $workspace, Application $application, Deployment $deployment): RedirectResponse
    {
        $this->authorize('deploy', $application);
        abort_unless($deployment->belongsToWorkspace($workspace), 404);

        if ($deployment->status !== 'succes') {
            return back()->with('error', 'Seul un déploiement en succès peut servir de cible de rollback.');
        }

        try {
            $rolledBack = $this->deployments->trigger(
                $deployment->targetEnvironment,
                source: 'manual',
                user: auth()->user(),
                commitSha: $deployment->commit_sha,
                branch: $deployment->branch,
            );
        } catch (DeploymentAlreadyRunningException|TargetEnvironmentMissingServerException|MissingEnvironmentVariablesException $e) {
            return back()->with('error', $e->getMessage());
        }

        return redirect()->route('deployments.show', [$workspace->slug, $application->slug, $rolledBack->uuid]);
    }
}
