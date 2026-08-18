<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\FiltersLists;
use App\Models\AuditLog;
use App\Models\User;
use App\Models\Workspace;
use App\Notifications\SetInitialPasswordNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\PermissionRegistrar;
use Throwable;

class UserController extends Controller
{
    use FiltersLists;

    private const ROLES = ['owner', 'manager', 'deployer', 'viewer'];

    /**
     * Membres du workspace (et non plus un annuaire global) : dérivés du pivot
     * Spatie "team" (model_has_roles) scopé par workspace_id.
     */
    private function membersQuery(Workspace $workspace)
    {
        return DB::table('model_has_roles')
            ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
            ->join('users', 'users.id', '=', 'model_has_roles.model_id')
            ->where('model_has_roles.model_type', User::class)
            ->where('model_has_roles.workspace_id', $workspace->id)
            ->select('users.id', 'users.uuid', 'users.name', 'users.email', 'users.email_verified_at', 'users.suspended_at', 'roles.name as role');
    }

    public function index(Workspace $workspace): Response
    {
        $users = $this->membersQuery($workspace)->orderBy('users.name')->paginate(20);

        $this->attachApplicationAccess($workspace, $users->getCollection());

        return Inertia::render('Users/Index', [
            'users' => ['data' => $users->items()],
            'kpis' => $this->memberKpis($workspace),
            'canManage' => auth()->user()->can('manage', $workspace),
        ]);
    }

    private function memberKpis(Workspace $workspace): array
    {
        $kpis = ['total' => 0, 'owner' => 0, 'manager' => 0, 'deployer' => 0, 'viewer' => 0];
        foreach ($this->membersQuery($workspace)->get()->countBy('role') as $role => $count) {
            if (array_key_exists($role, $kpis)) {
                $kpis[$role] = $count;
            }
            $kpis['total'] += $count;
        }

        return $kpis;
    }

    public function search(Request $request, Workspace $workspace): JsonResponse
    {
        $data = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'in:'.implode(',', self::ROLES)],
            'sort' => ['nullable', 'in:name,email'],
            'direction' => ['nullable', 'in:asc,desc'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $query = $this->membersQuery($workspace);
        $this->applySearch($query, $data['search'] ?? null, ['users.name', 'users.email']);

        if (! empty($data['status'])) {
            $query->where('roles.name', $data['status']);
        }

        $this->applySort($query, $data['sort'] ?? null, $data['direction'] ?? null, ['name', 'email'], 'name', 'asc');

        $users = $query->paginate($this->perPage($data['per_page'] ?? null, 20));

        $this->attachApplicationAccess($workspace, $users->getCollection());

        return response()->json([
            'data' => $users->items(),
            'meta' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'total' => $users->total(),
                'per_page' => $users->perPage(),
            ],
            'kpis' => $this->memberKpis($workspace),
        ]);
    }

    public function store(Request $request, Workspace $workspace): RedirectResponse
    {
        $this->authorize('manage', $workspace);

        $data = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255'],
            'role' => ['required', 'in:'.implode(',', self::ROLES)],
        ]);

        $user = User::where('email', $data['email'])->first();
        $isNewUser = ! $user;

        if (! $user) {
            $user = User::create([
                'name' => $data['name'] ?: Str::before($data['email'], '@'),
                'email' => $data['email'],
                'password' => Hash::make(Str::random(40)),
            ]);
        }

        app(PermissionRegistrar::class)->setPermissionsTeamId($workspace->id);
        $user->syncRoles([$data['role']]);

        if ($isNewUser) {
            $token = Password::createToken($user);
            $user->notify(new SetInitialPasswordNotification($token));
        }

        return back()->with('status', "{$user->email} a été ajouté au workspace avec le rôle {$data['role']}.");
    }

    public function show(Workspace $workspace, User $user): Response
    {
        abort_unless($user->roleInWorkspace($workspace), 404);

        $applications = $workspace->applications()
            ->whereHas('users', fn ($q) => $q->where('users.id', $user->id))
            ->get(['applications.id', 'applications.name', 'applications.slug']);

        $activity = AuditLog::where('user_id', $user->id)
            ->whereHas('application', fn ($q) => $q->where('workspace_id', $workspace->id))
            ->with('application:id,name,slug')
            ->latest()
            ->limit(50)
            ->get();

        return Inertia::render('Users/Show', [
            'user' => $user,
            'role' => $user->roleInWorkspace($workspace),
            'applications' => $applications,
            'activity' => $activity,
            'isSelf' => $user->id === auth()->id(),
            'canManage' => auth()->user()->can('manage', $workspace),
            'hasPassword' => ! is_null($user->password),
        ]);
    }

    public function update(Request $request, Workspace $workspace, User $user): RedirectResponse
    {
        $this->authorize('manage', $workspace);

        $data = $request->validate([
            'role' => ['required', 'in:'.implode(',', self::ROLES)],
        ]);

        app(PermissionRegistrar::class)->setPermissionsTeamId($workspace->id);
        $this->guardLastOwner($workspace, $user, $data['role']);

        $user->syncRoles([$data['role']]);

        return back()->with('status', 'Rôle mis à jour.');
    }

    public function destroy(Workspace $workspace, User $user): RedirectResponse
    {
        $this->authorize('manage', $workspace);
        abort_if($user->id === auth()->id(), 403, 'Utilisez votre page de profil pour quitter le workspace.');

        app(PermissionRegistrar::class)->setPermissionsTeamId($workspace->id);
        $this->guardLastOwner($workspace, $user, null);

        $user->syncRoles([]);

        DB::table('application_user')
            ->where('user_id', $user->id)
            ->whereIn('application_id', $workspace->applications()->pluck('id'))
            ->delete();

        return redirect()->route('users.index', $workspace->slug)->with('status', 'Membre retiré du workspace.');
    }

    public function resendVerification(Workspace $workspace, User $user): RedirectResponse
    {
        $this->authorize('manage', $workspace);

        if (! $user->hasVerifiedEmail()) {
            try {
                $user->sendEmailVerificationNotification();
            } catch (Throwable $e) {
                Log::warning('Failed to send verification email', ['user_id' => $user->id, 'error' => $e->getMessage()]);
            }
        }

        return back()->with('status', "Email de vérification renvoyé à {$user->email}.");
    }

    public function sendPasswordReset(Workspace $workspace, User $user): RedirectResponse
    {
        $this->authorize('manage', $workspace);

        $token = Password::createToken($user);
        $user->notify(new SetInitialPasswordNotification($token));

        return back()->with('status', "Lien de réinitialisation envoyé à {$user->email}.");
    }

    public function toggleSuspend(Workspace $workspace, User $user): RedirectResponse
    {
        $this->authorize('manage', $workspace);
        abort_if($user->id === auth()->id(), 403, 'Vous ne pouvez pas suspendre votre propre compte.');

        $user->update(['suspended_at' => $user->isSuspended() ? null : now()]);

        return back()->with('status', $user->isSuspended() ? 'Utilisateur suspendu.' : 'Utilisateur réactivé.');
    }

    private function guardLastOwner(Workspace $workspace, User $user, ?string $newRole): void
    {
        if ($user->roleInWorkspace($workspace) !== 'owner' || $newRole === 'owner') {
            return;
        }

        abort_if($workspace->ownerCount() <= 1, 422, "Impossible : {$user->name} est le dernier owner de ce workspace.");
    }

    private function attachApplicationAccess(Workspace $workspace, $users): void
    {
        $ids = $users->pluck('id');

        $access = DB::table('application_user')
            ->join('applications', 'applications.id', '=', 'application_user.application_id')
            ->where('applications.workspace_id', $workspace->id)
            ->whereIn('application_user.user_id', $ids)
            ->select('application_user.user_id', 'applications.name as application_name', 'applications.slug as application_slug')
            ->get()
            ->groupBy('user_id');

        $users->each(function ($user) use ($access) {
            $user->applications = $access->get($user->id, collect())->values();
        });
    }
}
