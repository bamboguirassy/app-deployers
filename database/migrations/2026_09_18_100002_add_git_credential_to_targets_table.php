<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('targets', function (Blueprint $table) {
            // token (PAT) | ssh_key — utilisée uniquement pour le clone du dépôt côté runner
            // en build centralisé ; sans rapport avec les credentials déjà présentes sur le
            // serveur cible pour le mode on_target (hors du contrôle de l'app).
            $table->string('git_credential_type')->nullable()->after('repository_provider');
            $table->text('git_credential_secret')->nullable()->after('git_credential_type');
        });
    }

    public function down(): void
    {
        Schema::table('targets', function (Blueprint $table) {
            $table->dropColumn(['git_credential_type', 'git_credential_secret']);
        });
    }
};
