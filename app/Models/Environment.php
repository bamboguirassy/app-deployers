<?php

namespace App\Models;

use App\Concerns\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Environment extends Model
{
    use BelongsToWorkspace;

    protected $fillable = ['application_id', 'name', 'slug', 'order'];

    protected static function booted(): void
    {
        static::creating(function (Environment $environment) {
            $environment->uuid ??= (string) Str::uuid();
            $environment->slug ??= Str::slug($environment->name);
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

    public function targetEnvironments(): HasMany
    {
        return $this->hasMany(TargetEnvironment::class);
    }

    public function resolveWorkspaceId(): ?int
    {
        return $this->application->workspace_id;
    }
}
