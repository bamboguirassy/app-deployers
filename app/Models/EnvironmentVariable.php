<?php

namespace App\Models;

use App\Concerns\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class EnvironmentVariable extends Model
{
    use BelongsToWorkspace;

    protected $fillable = ['target_environment_id', 'target_variable_id', 'value'];

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
        ];
    }

    public function targetEnvironment(): BelongsTo
    {
        return $this->belongsTo(TargetEnvironment::class);
    }

    public function targetVariable(): BelongsTo
    {
        return $this->belongsTo(TargetVariable::class);
    }

    public function resolveWorkspaceId(): ?int
    {
        return $this->targetEnvironment->resolveWorkspaceId();
    }
}
