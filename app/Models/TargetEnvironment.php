<?php

namespace App\Models;

use App\Concerns\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class TargetEnvironment extends Model
{
    use BelongsToWorkspace;

    protected $fillable = [
        'target_id', 'environment_id', 'server_id', 'deploy_path', 'git_branch', 'url',
        'last_deployed_sha',
    ];

    protected static function booted(): void
    {
        static::creating(function (TargetEnvironment $targetEnvironment) {
            $targetEnvironment->uuid ??= (string) Str::uuid();
        });
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    public function target(): BelongsTo
    {
        return $this->belongsTo(Target::class);
    }

    public function environment(): BelongsTo
    {
        return $this->belongsTo(Environment::class);
    }

    public function server(): BelongsTo
    {
        return $this->belongsTo(Server::class);
    }

    public function variables(): HasMany
    {
        return $this->hasMany(EnvironmentVariable::class);
    }

    public function deployments(): HasMany
    {
        return $this->hasMany(Deployment::class);
    }

    /**
     * Steps du pipeline propre à cet environnement — n'a de sens que quand
     * `target.uniform_pipeline = false` (voir `Target::pipelineStepsFor()`).
     */
    public function pipelineSteps(): HasMany
    {
        return $this->hasMany(PipelineStep::class)->orderBy('order');
    }

    public function resolveWorkspaceId(): ?int
    {
        return $this->target->application->workspace_id;
    }
}
