<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Le journal d'audit était jusqu'ici strictement rattaché à une
     * Application. Les actions du panneau super-admin (workspaces,
     * abonnements, utilisateurs) ne concernent aucune application précise :
     * on ajoute un "context" pour distinguer les entrées platform-admin des
     * entrées applicatives classiques, plutôt que de créer une table dédiée.
     *
     * application_id est nullable depuis sa création (voir
     * 2026_08_06_185806_create_audit_logs_table.php) — cette migration n'a
     * donc plus besoin d'un ALTER COLUMN spécifique par driver.
     */
    public function up(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->string('context')->nullable()->after('application_id');
        });
    }

    public function down(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->dropColumn('context');
        });
    }
};
