<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Spatie\Permission\PermissionRegistrar;

class Workspace extends Model
{
    protected $fillable = ['name', 'slug', 'created_by'];

    protected static function booted(): void
    {
        static::creating(function (Workspace $workspace) {
            $workspace->uuid ??= (string) Str::uuid();
            $workspace->slug ??= Str::slug($workspace->name).'-'.Str::lower(Str::random(4));
        });
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function applications(): HasMany
    {
        return $this->hasMany(Application::class);
    }

    public function servers(): HasMany
    {
        return $this->hasMany(Server::class);
    }

    /**
     * Applications visibles par cet utilisateur dans ce workspace : toutes si
     * owner, sinon uniquement celles auxquelles il a explicitement accès.
     */
    public function visibleApplicationsFor(User $user)
    {
        $query = $this->applications();

        if (! $user->isWorkspaceOwner($this)) {
            $query->whereHas('users', fn ($q) => $q->where('users.id', $user->id));
        }

        return $query;
    }

    /**
     * Membres du workspace (utilisateurs ayant un rôle dessus), avec leur rôle,
     * dérivés du pivot Spatie "team" (model_has_roles) plutôt que d'une table dédiée.
     */
    public function members()
    {
        return DB::table('model_has_roles')
            ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
            ->join('users', 'users.id', '=', 'model_has_roles.model_id')
            ->where('model_has_roles.model_type', User::class)
            ->where('model_has_roles.workspace_id', $this->id)
            ->select('users.id', 'users.name', 'users.email', 'roles.name as role')
            ->orderBy('users.name')
            ->get();
    }

    public function ownerCount(): int
    {
        app(PermissionRegistrar::class)->setPermissionsTeamId($this->id);

        return DB::table('model_has_roles')
            ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
            ->where('model_has_roles.model_type', User::class)
            ->where('model_has_roles.workspace_id', $this->id)
            ->where('roles.name', 'owner')
            ->count();
    }
}
