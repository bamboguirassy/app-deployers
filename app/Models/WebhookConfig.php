<?php

namespace App\Models;

use App\Concerns\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class WebhookConfig extends Model
{
    use BelongsToWorkspace;

    protected $fillable = ['target_id', 'provider', 'secret', 'enabled'];

    /**
     * Le secret ne doit jamais être sérialisé implicitement (props Inertia, API) :
     * il n'est révélé qu'à la demande via WebhookConfigController::revealSecret().
     */
    protected $hidden = ['secret'];

    protected static function booted(): void
    {
        static::creating(function (WebhookConfig $webhookConfig) {
            $webhookConfig->uuid ??= (string) Str::uuid();
        });
    }

    /**
     * Utilisé aussi bien dans les routes authentifiées que dans l'URL publique
     * de réception (webhooks.receive) : un UUID plutôt qu'un id auto-incrémenté
     * évite qu'un tiers puisse deviner/énumérer les URLs de webhook d'autres
     * targets.
     */
    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    protected function casts(): array
    {
        return [
            'secret' => 'encrypted',
            'enabled' => 'boolean',
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
