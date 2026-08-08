<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Nullable pour ne pas casser les configurations existantes (créées avant
     * l'introduction du registre de serveurs) : le formulaire exige désormais
     * un serveur pour toute nouvelle configuration ou modification.
     */
    public function up(): void
    {
        Schema::table('target_environments', function (Blueprint $table) {
            $table->foreignId('server_id')->nullable()->after('environment_id')->constrained('servers')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('target_environments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('server_id');
        });
    }
};
