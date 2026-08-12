<?php

namespace App\Models;

use App\Concerns\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class EnvironmentVariable extends Model
{
    use BelongsToWorkspace;

    protected $fillable = ['target_environment_id', 'key', 'value', 'is_secret'];

    protected static function booted(): void
    {
        static::creating(function (EnvironmentVariable $environmentVariable) {
            $environmentVariable->uuid ??= (string) Str::uuid();
        });
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    protected function casts(): array
    {
        return [
            'value' => 'encrypted',
            'is_secret' => 'boolean',
        ];
    }

    public function targetEnvironment(): BelongsTo
    {
        return $this->belongsTo(TargetEnvironment::class);
    }

    public function resolveWorkspaceId(): ?int
    {
        return $this->targetEnvironment->resolveWorkspaceId();
    }
}
