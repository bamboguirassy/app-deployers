<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Traçabilité pure (n'affecte pas l'accès, entièrement piloté par
 * Subscription::status déjà en place) : cycle de facturation choisi
 * (monthly/yearly) et prochaine date de facturation renvoyée par Paddle,
 * pour pouvoir les afficher sur la page Facturation.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->string('interval')->nullable()->after('plan_id');
            $table->timestamp('renews_at')->nullable()->after('grace_period_ends_at');
        });
    }

    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropColumn(['interval', 'renews_at']);
        });
    }
};
