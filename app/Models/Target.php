<?php

namespace App\Models;

use App\Concerns\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Target extends Model
{
    use BelongsToWorkspace;

    protected $fillable = [
        'application_id', 'framework_id', 'name', 'slug', 'order', 'repository', 'repository_provider',
        'uniform_pipeline',
    ];

    protected static function booted(): void
    {
        static::creating(function (Target $target) {
            $target->uuid ??= (string) Str::uuid();
            $target->slug ??= Str::slug($target->name);
        });
    }

    protected function casts(): array
    {
        return [
            'uniform_pipeline' => 'boolean',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    public function application(): BelongsTo
    {
        return $this->belongsTo(Application::class);
    }

    public function framework(): BelongsTo
    {
        return $this->belongsTo(Framework::class);
    }

    public function variables(): HasMany
    {
        return $this->hasMany(TargetVariable::class)->orderBy('order');
    }

    /**
     * Steps du pipeline uniforme (mode `uniform_pipeline = true`) — toujours
     * `target_environment_id = null`. En mode non-uniforme, chaque
     * environnement a son propre pipeline via `TargetEnvironment::pipelineSteps()`
     * — voir `pipelineStepsFor()` pour la résolution correcte selon le mode.
     */
    public function pipelineSteps(): HasMany
    {
        return $this->hasMany(PipelineStep::class)->whereNull('target_environment_id')->orderBy('order');
    }

    /**
     * Résout les steps de pipeline à utiliser pour un déploiement/l'édition,
     * selon le mode du Target : le pipeline uniforme partagé, ou celui propre
     * à l'environnement donné. `$targetEnvironment` est requis dès que
     * `uniform_pipeline` est `false`.
     */
    public function pipelineStepsFor(?TargetEnvironment $targetEnvironment = null): HasMany
    {
        if ($this->uniform_pipeline) {
            return $this->pipelineSteps();
        }

        if (! $targetEnvironment) {
            throw new \InvalidArgumentException('Un environnement est requis pour résoudre le pipeline d\'un target non-uniforme.');
        }

        return $targetEnvironment->pipelineSteps();
    }

    public function targetEnvironments(): HasMany
    {
        return $this->hasMany(TargetEnvironment::class);
    }

    public function webhookConfigs(): HasMany
    {
        return $this->hasMany(WebhookConfig::class);
    }

    public function resolveWorkspaceId(): ?int
    {
        return $this->application->workspace_id;
    }
}
