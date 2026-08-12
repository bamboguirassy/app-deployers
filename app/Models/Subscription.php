<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Subscription extends Model
{
    protected $fillable = [
        'workspace_id', 'plan_id', 'paddle_customer_id', 'paddle_subscription_id',
        'status', 'is_comped', 'interval', 'grace_period_ends_at', 'renews_at',
    ];

    protected function casts(): array
    {
        return [
            'is_comped' => 'boolean',
            'grace_period_ends_at' => 'datetime',
            'renews_at' => 'datetime',
        ];
    }

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    /**
     * Grâce accordée uniquement après un échec de paiement (past_due), jamais
     * pour une annulation volontaire — voir PaddleWebhookController.
     */
    public function isWithinGracePeriod(): bool
    {
        return $this->status === 'past_due'
            && $this->grace_period_ends_at !== null
            && $this->grace_period_ends_at->isFuture();
    }
}
