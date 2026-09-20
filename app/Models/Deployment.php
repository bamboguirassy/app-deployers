<?php

namespace App\Models;

use App\Concerns\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Deployment extends Model
{
    use BelongsToWorkspace;

    protected $fillable = [
        'target_environment_id', 'status', 'queued_reason', 'trigger_source', 'triggered_by_user_id',
        'cancelled_by_user_id', 'commit_sha', 'branch', 'started_at', 'finished_at', 'duration_ms',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'finished_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Deployment $deployment) {
            $deployment->uuid ??= (string) Str::uuid();
        });
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    public function targetEnvironment(): BelongsTo
    {
        return $this->belongsTo(TargetEnvironment::class);
    }

    public function triggeredBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'triggered_by_user_id');
    }

    public function cancelledBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cancelled_by_user_id');
    }

    public function steps(): HasMany
    {
        return $this->hasMany(DeploymentStep::class)->orderBy('order');
    }

    public function resolveWorkspaceId(): ?int
    {
        return $this->targetEnvironment->resolveWorkspaceId();
    }

    /**
     * Valeur de `queued_reason` : en attente d'un slot de déploiement
     * simultané du plan du workspace (voir QuotaGuard::claimDeploymentSlot).
     */
    public const QUEUED_FOR_CONCURRENCY = 'concurrency';

    public function isQueuedForConcurrency(): bool
    {
        return $this->status === 'pending' && $this->queued_reason === self::QUEUED_FOR_CONCURRENCY;
    }

    /**
     * Rang de ce déploiement dans la file d'attente de son workspace (1 = le
     * prochain à démarrer), ou null s'il n'attend pas de slot.
     *
     * Volontairement limité au workspace courant : un rang calculé sur
     * l'ensemble de la plateforme divulguerait l'activité des autres clients.
     */
    public function queuePosition(): ?int
    {
        if (! $this->isQueuedForConcurrency()) {
            return null;
        }

        $workspaceId = $this->resolveWorkspaceId();

        if (! $workspaceId) {
            return null;
        }

        return static::query()
            ->where('status', 'pending')
            ->where('queued_reason', self::QUEUED_FOR_CONCURRENCY)
            ->where('id', '<', $this->id)
            ->whereHas('targetEnvironment.target.application', fn ($q) => $q->where('workspace_id', $workspaceId))
            ->count() + 1;
    }

    /**
     * Vrai si aucun déploiement plus récent n'existe sur le même
     * TargetEnvironment — condition requise pour pouvoir reprendre ce
     * déploiement depuis son étape en échec (resumeFromFailure), afin de ne
     * pas rejouer une config obsolète par-dessus un déploiement plus récent.
     */
    public function isLatestForTargetEnvironment(): bool
    {
        return ! static::where('target_environment_id', $this->target_environment_id)
            ->where('id', '>', $this->id)
            ->exists();
    }
}
