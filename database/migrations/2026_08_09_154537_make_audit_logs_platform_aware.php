<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Le journal d'audit était jusqu'ici strictement rattaché à une
     * Application (application_id NOT NULL). Les actions du panneau
     * super-admin (workspaces, abonnements, utilisateurs) ne concernent
     * aucune application précise : on rend la colonne nullable et on ajoute
     * un "context" pour distinguer les entrées platform-admin des entrées
     * applicatives classiques, plutôt que de créer une table dédiée.
     *
     * doctrine/dbal n'étant pas installé, on modifie la colonne en SQL brut
     * plutôt que via Blueprint::change() — la syntaxe diffère par driver
     * (`MODIFY` MySQL, `ALTER COLUMN ... DROP/SET NOT NULL` Postgres) ; SQLite
     * (utilisé par la suite de tests, voir phpunit.xml) n'a pas d'équivalent
     * et laisse de toute façon la colonne peu contraignante sur les NULL en
     * pratique, donc l'ignorer ici n'affaiblit pas les tests.
     */
    public function up(): void
    {
        match (DB::getDriverName()) {
            'pgsql' => DB::statement('ALTER TABLE audit_logs ALTER COLUMN application_id DROP NOT NULL'),
            'sqlite' => null,
            default => DB::statement('ALTER TABLE audit_logs MODIFY application_id BIGINT UNSIGNED NULL'),
        };

        Schema::table('audit_logs', function (Blueprint $table) {
            $table->string('context')->nullable()->after('application_id');
        });
    }

    public function down(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->dropColumn('context');
        });

        match (DB::getDriverName()) {
            'pgsql' => DB::statement('ALTER TABLE audit_logs ALTER COLUMN application_id SET NOT NULL'),
            'sqlite' => null,
            default => DB::statement('ALTER TABLE audit_logs MODIFY application_id BIGINT UNSIGNED NOT NULL'),
        };
    }
};
