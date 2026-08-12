<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            // Distingue un abonnement Pro offert manuellement par un
            // super-admin (jamais facturé via Paddle) d'un abonnement payant
            // réel — voir AdminSubscriptionController::grantFree()/revoke().
            $table->boolean('is_comped')->default(false)->after('status');
        });

        Schema::table('subscription_history', function (Blueprint $table) {
            $table->text('note')->nullable()->after('source');
        });
    }

    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropColumn('is_comped');
        });

        Schema::table('subscription_history', function (Blueprint $table) {
            $table->dropColumn('note');
        });
    }
};
