<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WebhookBranchMapping extends Model
{
    protected $fillable = ['webhook_config_id', 'environment_id', 'branch'];

    public function webhookConfig(): BelongsTo
    {
        return $this->belongsTo(WebhookConfig::class);
    }

    public function environment(): BelongsTo
    {
        return $this->belongsTo(Environment::class);
    }
}
