<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\FiltersLists;
use App\Models\Application;
use App\Models\User;
use App\Models\Workspace;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ApplicationMemberController extends Controller
{
    use FiltersLists;

    private const ROLES = ['owner', 'manager', 'deployer', 'viewer'];

    /**
     * Liste des utilisateurs ayant accès à cette application (accès binaire) —
     * le rôle affiché vient du workspace, il n'est pas modifiable depuis ici.
     */
    private function membersQuery(Workspace $workspace, Application $application)
    {
        return DB::table('application_user')
            ->join('users', 'users.id', '=', 'application_user.user_id')
            ->join('model_has_roles', function ($join) use ($workspace) {
                $join->on('model_has_roles.model_id', '=', 'users.id')
                    ->where('model_has_roles.model_type', User::class)
                    ->where('model_has_roles.workspace_id', $workspace->id);
            })
            ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
            ->where('application_user.application_id', $application->id)
            ->select('users.id', 'users.name', 'users.email', 'roles.name as role');
    }

    public function search(Request $request, Workspace $workspace, Application $application): JsonResponse
    {
        $this->authorize('view', $application);

        $data = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'role' => ['nullable', 'in:'.implode(',', self::ROLES)],
            'sort' => ['nullable', 'in:name,email,role'],
            'direction' => ['nullable', 'in:asc,desc'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $query = $this->membersQuery($workspace, $application);
        $this->applySearch($query, $data['search'] ?? null, ['users.name', 'users.email']);

        if (! empty($data['role'])) {
            $query->where('roles.name', $data['role']);
        }

        $kpisQuery = $this->membersQuery($workspace, $application);
        $this->applySearch($kpisQuery, $data['search'] ?? null, ['users.name', 'users.email']);
        $kpis = ['total' => (clone $kpisQuery)->count()];
        foreach (self::ROLES as $role) {
            $kpis[$role] = (clone $kpisQuery)->where('roles.name', $role)->count();
        }

        $sortColumn = match ($data['sort'] ?? null) {
            'email' => 'users.email',
            'role' => 'roles.name',
            default => 'users.name',
        };
        $query->orderBy($sortColumn, in_array($data['direction'] ?? null, ['asc', 'desc'], true) ? $data['direction'] : 'asc');

        $members = $query->paginate($this->perPage($data['per_page'] ?? null, 20));

        return response()->json([
            'data' => $members->items(),
            'meta' => [
                'current_page' => $members->currentPage(),
                'last_page' => $members->lastPage(),
                'total' => $members->total(),
                'per_page' => $members->perPage(),
            ],
            'kpis' => $kpis,
        ]);
    }

    /**
     * Accorde l'accès à cette application à un utilisateur déjà membre du
     * workspace (l'accès applicatif ne crée jamais de compte ni de rôle workspace
     * — voir la gestion des membres du workspace pour ça).
     */
    public function store(Request $request, Workspace $workspace, Application $application): RedirectResponse
    {
        $this->authorize('update', $application);

        $data = $request->validate([
            'email' => ['required', 'email', 'max:255'],
        ]);

        $user = User::where('email', $data['email'])->first();

        if (! $user || ! $user->roleInWorkspace($workspace)) {
            throw ValidationException::withMessages([
                'email' => "Cet utilisateur doit d'abord être ajouté au workspace avant de pouvoir accéder à une application.",
            ]);
        }

        $application->users()->syncWithoutDetaching([$user->id]);

        AuditLogger::log($application, 'member.access_granted', $user);

        return back()->with('status', "{$user->email} a désormais accès à cette application.");
    }

    public function destroy(Workspace $workspace, Application $application, User $user): RedirectResponse
    {
        $this->authorize('update', $application);

        $application->users()->detach($user->id);

        AuditLogger::log($application, 'member.access_revoked', $user);

        return back()->with('status', 'Accès retiré.');
    }
}
