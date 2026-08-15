<?php

namespace App\Http\Middleware;

use App\Models\Deployment;
use App\Models\Workspace;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Middleware;
use Throwable;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $workspace = $request->route('workspace');
        $user = $request->user();
        $plan = $workspace instanceof Workspace ? $workspace->effectivePlan() : null;

        return [
            ...parent::share($request),
            'locale' => app()->getLocale(),
            'auth' => [
                'user' => $user,
            ],
            'workspace' => $workspace instanceof Workspace ? [
                'id' => $workspace->id,
                'name' => $workspace->name,
                'slug' => $workspace->slug,
                'role' => $user?->roleInWorkspace($workspace),
                'plan' => ['slug' => $plan->slug, 'name' => $plan->name],
            ] : null,
            'workspaces' => $user
                ? $user->workspaces()->get(['workspaces.id', 'workspaces.name', 'workspaces.slug'])
                : [],
            'flash' => [
                'status' => fn () => $request->session()->get('status'),
                'error' => fn () => $request->session()->get('error'),
            ],
            // État initial du badge "déploiements en cours" (sidebar) — tenu à
            // jour ensuite en direct via le channel privé workspace.{id} (voir
            // DeploymentStatusUpdated). Évalué à la volée : jamais mis en cache,
            // toujours l'état réel au moment du rendu de la page. Try/catch
            // délibéré : c'est une feature secondaire (bannière), elle ne doit
            // jamais faire planter une page entière si sa requête échoue.
            'activeDeployments' => function () use ($workspace) {
                if (! $workspace instanceof Workspace) {
                    return ['count' => 0, 'items' => []];
                }

                try {
                    return $this->activeDeployments($workspace);
                } catch (Throwable $e) {
                    Log::error('activeDeployments (Inertia shared prop) a échoué', [
                        'workspace_id' => $workspace->id,
                        'error' => $e->getMessage(),
                    ]);

                    return ['count' => 0, 'items' => []];
                }
            },
        ];
    }

    private function activeDeployments(Workspace $workspace): array
    {
        $query = Deployment::query()
            ->whereIn('status', ['pending', 'running'])
            ->whereHas('targetEnvironment.target.application', fn ($q) => $q->where('workspace_id', $workspace->id));

        $items = (clone $query)
            ->with(['targetEnvironment.target.application', 'targetEnvironment.environment'])
            ->withCount([
                'steps as steps_total',
                'steps as steps_done' => fn ($q) => $q->whereIn('status', ['succes', 'echec', 'annule', 'skipped']),
            ])
            ->latest()
            ->limit(10)
            ->get()
            ->map(function (Deployment $deployment) use ($workspace) {
                $target = $deployment->targetEnvironment->target;
                $application = $target->application;

                return [
                    'id' => $deployment->id,
                    'status' => $deployment->status,
                    'started_at' => $deployment->started_at?->toIso8601String(),
                    'application_name' => $application->name,
                    'target_name' => $target->name,
                    'environment_name' => $deployment->targetEnvironment->environment->name,
                    'show_url' => route('deployments.show', [$workspace->slug, $application->slug, $deployment->uuid]),
                    'steps_total' => $deployment->steps_total,
                    'steps_done' => $deployment->steps_done,
                ];
            });

        return [
            'count' => (clone $query)->count(),
            'items' => $items,
        ];
    }
}
