<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Environment extends Model
{
    protected $fillable = ['application_id', 'name', 'slug', 'order'];

    protected static function booted(): void
    {
        static::creating(function (Environment $environment) {
            $environment->slug ??= Str::slug($environment->name);
        });
    }

    public function application(): BelongsTo
    {
        return $this->belongsTo(Application::class);
    }

    public function targetEnvironments(): HasMany
    {
        return $this->hasMany(TargetEnvironment::class);
    }
}
