<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EnvironmentVariable extends Model
{
    protected $fillable = ['target_environment_id', 'key', 'value', 'is_secret'];

    protected function casts(): array
    {
        return [
            'value' => 'encrypted',
            'is_secret' => 'boolean',
        ];
    }

    public function targetEnvironment(): BelongsTo
    {
        return $this->belongsTo(TargetEnvironment::class);
    }
}
