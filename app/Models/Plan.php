<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Plan extends Model
{
    protected $fillable = [
        'slug', 'name', 'max_applications', 'max_concurrent_deployments',
        'paddle_price_id_monthly', 'paddle_price_id_yearly',
    ];

    public function paddlePriceIdFor(string $interval): ?string
    {
        return match ($interval) {
            'monthly' => $this->paddle_price_id_monthly,
            'yearly' => $this->paddle_price_id_yearly,
            default => null,
        };
    }

    public static function free(): self
    {
        return static::query()->where('slug', 'free')->firstOrFail();
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }
}
