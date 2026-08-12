<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Passe la FK target_environments.server_id de nullOnDelete() à
 * restrictOnDelete() : sur une instance mutualisée (SaaS), la suppression
 * silencieuse du serveur ne doit plus jamais faire retomber un pipeline en
 * exécution locale sur le worker partagé (voir ServerController::destroy()
 * pour le message d'erreur applicatif équivalent, vérifié en amont).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('target_environments', function (Blueprint $table) {
            $table->dropForeign(['server_id']);
        });

        Schema::table('target_environments', function (Blueprint $table) {
            $table->foreign('server_id')->references('id')->on('servers')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('target_environments', function (Blueprint $table) {
            $table->dropForeign(['server_id']);
        });

        Schema::table('target_environments', function (Blueprint $table) {
            $table->foreign('server_id')->references('id')->on('servers')->nullOnDelete();
        });
    }
};
