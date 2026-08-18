<?php

namespace App\Models;

use App\Concerns\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class TargetVariable extends Model
{
    use BelongsToWorkspace;

    protected $fillable = ['target_id', 'key', 'default_value', 'is_secret', 'order'];

    protected static function booted(): void
    {
        static::creating(function (TargetVariable $variable) {
            $variable->uuid ??= (string) Str::uuid();
        });
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    protected function casts(): array
    {
        return [
            'default_value' => 'encrypted',
            'is_secret' => 'boolean',
        ];
    }

    public function target(): BelongsTo
    {
        return $this->belongsTo(Target::class);
    }

    public function values(): HasMany
    {
        return $this->hasMany(EnvironmentVariable::class);
    }

    public function resolveWorkspaceId(): ?int
    {
        return $this->target->resolveWorkspaceId();
    }
}
