<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApplicationNotificationSetting extends Model
{
    protected $fillable = [
        'application_id',
        'notify_on_start',
        'notify_on_success',
        'notify_on_failure',
    ];

    protected function casts(): array
    {
        return [
            'notify_on_start'   => 'boolean',
            'notify_on_success' => 'boolean',
            'notify_on_failure' => 'boolean',
        ];
    }

    public function application(): BelongsTo
    {
        return $this->belongsTo(Application::class);
    }
}
