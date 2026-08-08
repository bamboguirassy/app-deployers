<?php

namespace App\Http\Middleware;

use App\Models\Workspace;
use Illuminate\Http\Request;
use Inertia\Middleware;

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

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user,
            ],
            'workspace' => $workspace instanceof Workspace ? [
                'id' => $workspace->id,
                'name' => $workspace->name,
                'slug' => $workspace->slug,
                'role' => $user?->roleInWorkspace($workspace),
            ] : null,
            'workspaces' => $user
                ? $user->workspaces()->get(['workspaces.id', 'workspaces.name', 'workspaces.slug'])
                : [],
        ];
    }
}
