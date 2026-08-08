<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PipelineStep extends Model
{
    protected $fillable = ['target_id', 'label', 'command', 'order', 'timeout_seconds', 'continue_on_failure'];

    protected function casts(): array
    {
        return [
            'continue_on_failure' => 'boolean',
        ];
    }

    public function target(): BelongsTo
    {
        return $this->belongsTo(Target::class);
    }
}
