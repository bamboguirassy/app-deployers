<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('target_environments', function (Blueprint $table) {
            // Dernier commit effectivement déployé avec succès (tout mode de
            // pipeline confondu — voir App\StepActions\CloneStepAction/SyncStepAction)
            // — pose le terrain pour un futur rollback basé sur l'état réel
            // plutôt que le rejeu complet du pipeline (hors scope ici).
            $table->string('last_deployed_sha')->nullable()->after('git_branch');
        });
    }

    public function down(): void
    {
        Schema::table('target_environments', function (Blueprint $table) {
            $table->dropColumn('last_deployed_sha');
        });
    }
};
