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

    protected $fillable = ['application_id', 'framework_id', 'name', 'slug', 'order', 'repository', 'repository_provider'];

    protected static function booted(): void
    {
        static::creating(function (Target $target) {
            $target->uuid ??= (string) Str::uuid();
            $target->slug ??= Str::slug($target->name);
        });
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

    public function pipelineSteps(): HasMany
    {
        return $this->hasMany(PipelineStep::class)->orderBy('order');
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
