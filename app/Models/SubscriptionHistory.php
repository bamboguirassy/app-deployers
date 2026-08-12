<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Journal append-only des changements d'abonnement (plan/statut) pour un
 * workspace. Alimenté depuis AdminSubscriptionController (source='admin') et
 * PaddleWebhookController (source='webhook'). Ne remplace pas Subscription
 * (état courant) — ne fait qu'historiser ses transitions à partir du moment
 * où ce suivi a été activé (aucun backfill des événements passés).
 */
class SubscriptionHistory extends Model
{
    protected $table = 'subscription_history';

    protected $fillable = [
        'workspace_id', 'plan_id', 'status', 'interval', 'changed_by_user_id', 'source', 'note',
    ];

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    public function changedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by_user_id');
    }
}
