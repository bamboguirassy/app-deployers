<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\FiltersLists;
use App\Models\Application;
use App\Models\User;
use App\Models\Workspace;
use App\Notifications\ApplicationInvitationNotification;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Spatie\Permission\PermissionRegistrar;

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
            ->select('users.id', 'users.uuid', 'users.name', 'users.email', 'roles.name as role', 'application_user.invitation_pending');
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
     * Accorde l'accès à cette application.
     * — Si l'utilisateur existe et est déjà membre du workspace : ajout direct.
     * — S'il existe mais n'est pas encore membre du workspace : ajout au workspace
     *   avec le rôle choisi, puis ajout à l'application.
     * — S'il n'existe pas : création de compte (sans mot de passe), ajout au
     *   workspace, ajout à l'application avec invitation_pending = true, et envoi
     *   d'un email d'invitation pour définir son mot de passe.
     */
    public function store(Request $request, Workspace $workspace, Application $application): RedirectResponse
    {
        $this->authorize('update', $application);

        $data = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'role'  => ['required', 'in:'.implode(',', self::ROLES)],
        ]);

        $user = User::where('email', $data['email'])->first();
        $isNewUser = ! $user;
        $wasWorkspaceMember = $user && $user->roleInWorkspace($workspace);

        if (! $user) {
            $user = User::create([
                'name'     => Str::before($data['email'], '@'),
                'email'    => $data['email'],
                'password' => Hash::make(Str::random(40)),
            ]);
        }

        if (! $wasWorkspaceMember) {
            app(PermissionRegistrar::class)->setPermissionsTeamId($workspace->id);
            $user->syncRoles([$data['role']]);
        }

        $application->users()->syncWithoutDetaching([
            $user->id => ['invitation_pending' => $isNewUser],
        ]);

        AuditLogger::log($application, 'member.access_granted', $user);

        if ($isNewUser) {
            $token = Password::createToken($user);
            $user->notify(new ApplicationInvitationNotification($token, $application, $workspace));

            return back()->with('status', "Invitation envoyée à {$user->email}.");
        }

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
