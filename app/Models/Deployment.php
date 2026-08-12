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
        'target_environment_id', 'status', 'trigger_source', 'triggered_by_user_id',
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
}
