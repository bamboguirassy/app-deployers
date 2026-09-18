<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('target_environments', function (Blueprint $table) {
            // on_target (défaut, comportement actuel) | centralized
            $table->string('build_mode')->default('on_target')->after('git_branch');
            // Sous-dossier du workspace de build à synchroniser — requis si build_mode = centralized.
            $table->string('build_output_path')->nullable()->after('build_mode');
            // Dernier commit effectivement déployé avec succès — pose le terrain pour un futur
            // rollback basé sur l'état réel plutôt que le rejeu complet du pipeline (hors scope ici).
            $table->string('last_deployed_sha')->nullable()->after('build_output_path');
        });
    }

    public function down(): void
    {
        Schema::table('target_environments', function (Blueprint $table) {
            $table->dropColumn(['build_mode', 'build_output_path', 'last_deployed_sha']);
        });
    }
};
