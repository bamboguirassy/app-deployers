<?php

namespace App\Models;

use App\Concerns\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class PipelineStep extends Model
{
    use BelongsToWorkspace;

    protected $fillable = ['target_id', 'label', 'type', 'config', 'order', 'timeout_seconds', 'continue_on_failure'];

    protected static function booted(): void
    {
        static::creating(function (PipelineStep $pipelineStep) {
            $pipelineStep->uuid ??= (string) Str::uuid();
        });
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    protected function casts(): array
    {
        return [
            'config' => 'array',
            'continue_on_failure' => 'boolean',
        ];
    }

    public function target(): BelongsTo
    {
        return $this->belongsTo(Target::class);
    }

    public function resolveWorkspaceId(): ?int
    {
        return $this->target->resolveWorkspaceId();
    }
}
