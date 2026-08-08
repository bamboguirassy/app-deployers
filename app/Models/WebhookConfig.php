<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WebhookConfig extends Model
{
    protected $fillable = ['target_id', 'provider', 'secret', 'enabled'];

    /**
     * Le secret ne doit jamais être sérialisé implicitement (props Inertia, API) :
     * il n'est révélé qu'à la demande via WebhookConfigController::revealSecret().
     */
    protected $hidden = ['secret'];

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

    public function branchMappings(): HasMany
    {
        return $this->hasMany(WebhookBranchMapping::class);
    }
}
