<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        // Webhooks entrants : limite par (IP, config de webhook) pour encaisser les
        // retries légitimes des providers tout en freinant le brute-force de secret.
        RateLimiter::for('webhooks', function ($request) {
            return Limit::perMinute(30)->by($request->ip().'|'.$request->route('webhookConfig'));
        });
    }
}
