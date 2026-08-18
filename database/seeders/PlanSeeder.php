<?php

namespace Database\Seeders;

use App\Models\Plan;
use Illuminate\Database\Seeder;

class PlanSeeder extends Seeder
{
    public const PLANS = [
        [
            'slug' => 'free',
            'name' => 'Free',
            'max_applications' => 2,
            'max_concurrent_deployments' => 1,
        ],
        [
            'slug' => 'pro',
            'name' => 'Pro',
            'max_applications' => null,
            'max_concurrent_deployments' => 3,
        ],
    ];

    public function run(): void
    {
        foreach (self::PLANS as $plan) {
            if ($plan['slug'] === 'pro') {
                $plan['paddle_price_id_monthly'] = config('paddle.pro_price_id_monthly');
                $plan['paddle_price_id_yearly'] = config('paddle.pro_price_id_yearly');
            }

            Plan::query()->updateOrCreate(['slug' => $plan['slug']], $plan);
        }
    }
}
