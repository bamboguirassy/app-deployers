<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Traits\HasRoles;

#[Fillable(['name', 'email', 'password', 'suspended_at'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, HasRoles;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'suspended_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * Workspaces this user has a role on (owner, manager, deployer, viewer),
     * derived from the spatie "team" pivot rather than a dedicated table.
     */
    public function workspaces(): BelongsToMany
    {
        return $this->belongsToMany(Workspace::class, 'model_has_roles', 'model_id', 'workspace_id')
            ->wherePivot('model_type', static::class)
            ->distinct();
    }

    /**
     * Applications this user was explicitly granted access to (binary, no role —
     * the role comes from the workspace). Does NOT include the implicit
     * "owner sees everything" bypass — check hasAccessToApplication() for that.
     */
    public function applications(): BelongsToMany
    {
        return $this->belongsToMany(Application::class, 'application_user');
    }

    public function roleInWorkspace(Workspace $workspace): ?string
    {
        return DB::table('model_has_roles')
            ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
            ->where('model_has_roles.model_id', $this->id)
            ->where('model_has_roles.model_type', static::class)
            ->where('model_has_roles.workspace_id', $workspace->id)
            ->value('roles.name');
    }

    public function isWorkspaceOwner(Workspace $workspace): bool
    {
        return $this->roleInWorkspace($workspace) === 'owner';
    }

    public function hasAccessToApplication(Application $application): bool
    {
        if ($this->isWorkspaceOwner($application->workspace)) {
            return true;
        }

        return $this->applications()->where('applications.id', $application->id)->exists();
    }

    public function isSuspended(): bool
    {
        return $this->suspended_at !== null;
    }
}
