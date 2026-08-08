<?php

namespace App\Http\Controllers;

use App\Models\Workspace;
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
        $workspace = auth()->user()->workspaces()->orderByDesc('workspaces.id')->first();

        if (! $workspace) {
            return redirect()->route('workspaces.create');
        }

        return redirect()->route('dashboard', $workspace->slug);
    }

    public function create(): Response
    {
        return Inertia::render('Workspaces/Create');
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $workspace = DB::transaction(function () use ($data) {
            $workspace = Workspace::create([
                'name' => $data['name'],
                'created_by' => auth()->id(),
            ]);

            app(PermissionRegistrar::class)->setPermissionsTeamId($workspace->id);
            auth()->user()->assignRole('owner');

            return $workspace;
        });

        return redirect()->route('dashboard', $workspace->slug)->with('status', 'Workspace créé.');
    }
}
