<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Concerns\FiltersLists;
use App\Http\Controllers\Controller;
use App\Models\Deployment;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Monitoring cross-workspace des déploiements pour le super-admin — lecture
 * seule (aucune action de trigger/cancel ici), entièrement gardé par
 * `platform-admin.access`. Volontairement un contrôleur séparé de
 * DeploymentController plutôt qu'une réutilisation/bypass de l'ability
 * `deploy` d'ApplicationPolicy (qui sert aussi à autoriser le déclenchement /
 * l'annulation) : ça évite tout risque d'élargir par erreur les droits de
 * mutation des super-admins sur des workspaces dont ils ne sont pas membres.
 */
class AdminDeploymentController extends Controller
{
    use FiltersLists;

    private const WITH = [
        'targetEnvironment.target.application.workspace',
        'targetEnvironment.environment',
        'triggeredBy',
    ];

    private function kpis($query): array
    {
        $base = clone $query;

        return [
            'total' => (clone $base)->count(),
            'running' => (clone $base)->whereIn('status', ['running', 'pending'])->count(),
            'echec' => (clone $base)->where('status', 'echec')->count(),
            'echec_24h' => (clone $base)->where('status', 'echec')->where('created_at', '>=', now()->subDay())->count(),
        ];
    }

    public function index(): Response
    {
        $this->authorize('platform-admin.access');

        $deployments = Deployment::query()
            ->with(self::WITH)
            ->latest()
            ->paginate(20);

        return Inertia::render('Admin/Deployments/Index', [
            'deployments' => ['data' => $deployments->items()],
            'kpis' => $this->kpis(Deployment::query()),
        ]);
    }

    public function search(Request $request): JsonResponse
    {
        $this->authorize('platform-admin.access');

        $data = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'in:pending,running,succes,echec,annule'],
            'trigger_source' => ['nullable', 'in:manual,webhook,scheduled'],
            'workspace_id' => ['nullable', 'integer'],
            'application_id' => ['nullable', 'integer'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date'],
            'sort' => ['nullable', 'in:created_at,started_at,finished_at,duration_ms,status'],
            'direction' => ['nullable', 'in:asc,desc'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $query = Deployment::query();
        $this->applySearch($query, $data['search'] ?? null, ['deployments.branch', 'deployments.commit_sha']);

        if (! empty($data['status'])) {
            $query->where('status', $data['status']);
        }
        if (! empty($data['trigger_source'])) {
            $query->where('trigger_source', $data['trigger_source']);
        }
        if (! empty($data['application_id'])) {
            $query->whereHas('targetEnvironment.target', fn ($q) => $q->where('application_id', $data['application_id']));
        }
        if (! empty($data['workspace_id'])) {
            $query->whereHas(
                'targetEnvironment.target.application',
                fn (Builder $q) => $q->where('workspace_id', $data['workspace_id'])
            );
        }
        if (! empty($data['date_from'])) {
            $query->whereDate('created_at', '>=', $data['date_from']);
        }
        if (! empty($data['date_to'])) {
            $query->whereDate('created_at', '<=', $data['date_to']);
        }

        $kpis = $this->kpis($query);

        $this->applySort($query, $data['sort'] ?? null, $data['direction'] ?? null, ['created_at', 'started_at', 'finished_at', 'duration_ms', 'status'], 'created_at');

        $deployments = $query->with(self::WITH)->paginate($this->perPage($data['per_page'] ?? null, 20));

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

    public function show(Deployment $deployment): Response
    {
        $this->authorize('platform-admin.access');

        $deployment->load(array_merge(['steps'], self::WITH));

        return Inertia::render('Admin/Deployments/Show', [
            'deployment' => $deployment,
        ]);
    }
}
