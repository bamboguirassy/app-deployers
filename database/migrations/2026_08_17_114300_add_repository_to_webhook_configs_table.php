<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('webhook_configs', function (Blueprint $table) {
            // "owner/repo" du dépôt sélectionné via une connexion Git (nullable :
            // reste optionnel pour les intégrations configurées manuellement).
            $table->string('repository')->nullable()->after('provider');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('webhook_configs', function (Blueprint $table) {
            $table->dropColumn('repository');
        });
    }
};
