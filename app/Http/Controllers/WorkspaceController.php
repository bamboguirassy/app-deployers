<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use App\Models\Workspace;
use App\Services\QuotaGuard;
use App\Services\WorkspaceQuotaExceededException;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\PermissionRegistrar;

class WorkspaceController extends Controller
{
    /**
     * Point d'entrée après connexion : redirige vers le workspace le plus
     * récemment créé auquel l'utilisateur a accès, ou vers la création d'un
     * premier workspace s'il n'en a aucun.
     */
    public function redirectToDefault(): RedirectResponse
    {
        $user = auth()->user();

        $workspace = $user->lastWorkspace && $user->workspaces()->whereKey($user->last_workspace_id)->exists()
            ? $user->lastWorkspace
            : $user->workspaces()->orderByDesc('workspaces.id')->first();

        if (! $workspace) {
            return redirect()->route('workspaces.create');
        }

        return redirect()->route('dashboard', $workspace->slug);
    }

    public function create(): Response
    {
        return Inertia::render('Workspaces/Create');
    }

    public function store(Request $request, QuotaGuard $quotaGuard): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        try {
            $quotaGuard->assertCanCreateWorkspace($request->user());
        } catch (WorkspaceQuotaExceededException $e) {
            return redirect()->route('workspaces.create')
                ->with('error', $e->getMessage());
        }

        $workspace = DB::transaction(function () use ($data) {
            $workspace = Workspace::create([
                'name' => $data['name'],
                'created_by' => auth()->id(),
            ]);

            app(PermissionRegistrar::class)->setPermissionsTeamId($workspace->id);
            auth()->user()->assignRole('owner');

            $workspace->subscription()->create([
                'plan_id' => Plan::free()->id,
                'status' => 'active',
            ]);

            return $workspace;
        });

        return redirect()->route('dashboard', $workspace->slug)->with('status', 'Workspace créé.');
    }
}
