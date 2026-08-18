<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Spatie\Permission\PermissionRegistrar;

class Workspace extends Model
{
    protected $fillable = ['name', 'slug', 'created_by', 'suspended_at'];

    protected function casts(): array
    {
        return [
            'suspended_at' => 'datetime',
        ];
    }

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

    public function gitConnections(): HasMany
    {
        return $this->hasMany(GitConnection::class);
    }

    public function subscription(): HasOne
    {
        return $this->hasOne(Subscription::class);
    }

    public function subscriptionHistory(): HasMany
    {
        return $this->hasMany(SubscriptionHistory::class)->latest();
    }

    /**
     * Application la plus récemment créée du workspace, utilisée uniquement
     * pour afficher un logo représentatif dans la liste admin (les workspaces
     * n'ont pas leur propre logo).
     */
    public function latestApplication(): HasOne
    {
        return $this->hasOne(Application::class)->latestOfMany();
    }

    /**
     * Plan réellement applicable maintenant : celui de la subscription si elle
     * est active, ou encore payante pendant sa grâce (échec de paiement
     * seulement, voir Subscription::isWithinGracePeriod()) ; sinon on retombe
     * silencieusement sur le plan free plutôt que de bloquer le workspace.
     */
    public function effectivePlan(): Plan
    {
        $subscription = $this->subscription;

        if (! $subscription) {
            return Plan::free();
        }

        if ($subscription->status === 'active' || $subscription->isWithinGracePeriod()) {
            return $subscription->plan;
        }

        return Plan::free();
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

    public function isSuspended(): bool
    {
        return $this->suspended_at !== null;
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
