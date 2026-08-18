<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Concerns\FiltersLists;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\PlatformAuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AdminUserController extends Controller
{
    use FiltersLists;

    private function kpis(): array
    {
        return [
            'total' => User::count(),
            'suspended' => User::whereNotNull('suspended_at')->count(),
            'super_admins' => User::where('is_super_admin', true)->count(),
        ];
    }

    /**
     * Attaches each user's workspace memberships (id, name, slug, role) as a
     * plain "workspaces" attribute, computed via a single grouped query across
     * model_has_roles + roles + workspaces for the whole page of user ids —
     * not User::workspaces() per row, which would N+1 and can't expose the
     * per-workspace role anyway (Spatie's team pivot doesn't join roles).
     *
     * @param  iterable<User>  $users
     */
    private function attachLastActivity(iterable $users): void
    {
        $users = collect($users);
        $userIds = $users->pluck('id');

        if ($userIds->isEmpty()) {
            return;
        }

        $activities = DB::table('sessions')
            ->whereIn('user_id', $userIds)
            ->select('user_id', DB::raw('MAX(last_activity) as last_activity'))
            ->groupBy('user_id')
            ->pluck('last_activity', 'user_id');

        $users->each(function (User $user) use ($activities) {
            $ts = $activities->get($user->id);
            $user->setAttribute('last_active_at', $ts ? \Carbon\Carbon::createFromTimestamp($ts)->toIso8601String() : null);
        });
    }

    private function attachWorkspaces(iterable $users): void
    {
        $users = collect($users);
        $userIds = $users->pluck('id');

        if ($userIds->isEmpty()) {
            return;
        }

        $memberships = DB::table('model_has_roles')
            ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
            ->join('workspaces', 'workspaces.id', '=', 'model_has_roles.workspace_id')
            ->where('model_has_roles.model_type', User::class)
            ->whereIn('model_has_roles.model_id', $userIds)
            ->select(
                'model_has_roles.model_id as user_id',
                'workspaces.id as id',
                'workspaces.name as name',
                'workspaces.slug as slug',
                'roles.name as role'
            )
            ->orderBy('workspaces.name')
            ->get()
            ->groupBy('user_id');

        $users->each(function (User $user) use ($memberships) {
            $user->setAttribute(
                'workspaces',
                ($memberships->get($user->id) ?? collect())
                    ->map(fn ($row) => ['id' => $row->id, 'name' => $row->name, 'slug' => $row->slug, 'role' => $row->role])
                    ->values()
            );
        });
    }

    public function index(): Response
    {
        $this->authorize('platform-admin.access');

        $users = User::query()->orderBy('name')->paginate(20);
        $this->attachWorkspaces($users->items());
        $this->attachLastActivity($users->items());

        return Inertia::render('Admin/Users/List', [
            'users' => ['data' => $users->items()],
            'kpis' => $this->kpis(),
        ]);
    }

    public function search(Request $request): JsonResponse
    {
        $this->authorize('platform-admin.access');

        $data = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'in:suspended,active,super_admin'],
            'sort' => ['nullable', 'in:name,email,created_at'],
            'direction' => ['nullable', 'in:asc,desc'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $query = User::query();
        $this->applySearch($query, $data['search'] ?? null, ['name', 'email']);

        if (($data['status'] ?? null) === 'suspended') {
            $query->whereNotNull('suspended_at');
        } elseif (($data['status'] ?? null) === 'active') {
            $query->whereNull('suspended_at');
        } elseif (($data['status'] ?? null) === 'super_admin') {
            $query->where('is_super_admin', true);
        }

        $this->applySort($query, $data['sort'] ?? null, $data['direction'] ?? null, ['name', 'email', 'created_at'], 'name', 'asc');

        $users = $query->paginate($this->perPage($data['per_page'] ?? null, 20));
        $this->attachWorkspaces($users->items());
        $this->attachLastActivity($users->items());

        return response()->json([
            'data' => $users->items(),
            'meta' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'total' => $users->total(),
                'per_page' => $users->perPage(),
            ],
            'kpis' => $this->kpis(),
        ]);
    }

    public function promote(User $user): RedirectResponse
    {
        $this->authorize('platform-admin.manageUsers');

        $user->update(['is_super_admin' => true]);

        PlatformAuditLogger::log('user.promote', $user);

        return back()->with('status', "{$user->name} est désormais super-admin.");
    }

    public function demote(User $user): RedirectResponse
    {
        $this->authorize('platform-admin.manageUsers');

        if ($user->id === auth()->id()) {
            throw ValidationException::withMessages([
                'user' => 'Vous ne pouvez pas vous retirer vous-même les droits super-admin.',
            ]);
        }

        $user->update(['is_super_admin' => false]);

        PlatformAuditLogger::log('user.demote', $user);

        return back()->with('status', "{$user->name} n'est plus super-admin.");
    }
}
