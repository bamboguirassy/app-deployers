<?php

namespace App\Models;

use App\Concerns\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class WebhookBranchMapping extends Model
{
    use BelongsToWorkspace;

    protected $fillable = ['webhook_config_id', 'environment_id', 'branch'];

    protected static function booted(): void
    {
        static::creating(function (WebhookBranchMapping $branchMapping) {
            $branchMapping->uuid ??= (string) Str::uuid();
        });
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    public function webhookConfig(): BelongsTo
    {
        return $this->belongsTo(WebhookConfig::class);
    }

    public function environment(): BelongsTo
    {
        return $this->belongsTo(Environment::class);
    }

    public function resolveWorkspaceId(): ?int
    {
        return $this->webhookConfig->resolveWorkspaceId();
    }
}
