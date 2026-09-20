<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('billing:expire-grace-periods')->daily();
Schedule::command('deploy:reconcile-stuck')->everyFiveMinutes();
// Garde chaud le cache des tarifs Paddle affichés sur /tarifs, /pricing et la
// page de facturation — voir App\Services\PaddlePriceCatalog.
Schedule::command('paddle:sync-prices')->hourly();
