<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Sécurité : les routes exposaient jusqu'ici l'identifiant auto-incrémenté
     * (facile à énumérer/deviner) pour ces modèles. On ajoute un UUID dédié au
     * routing (getRouteKeyName()), sans toucher à la clé primaire ni aux
     * relations existantes.
     */
    private const TABLES = [
        'targets',
        'environments',
        'target_environments',
        'pipeline_steps',
        'environment_variables',
        'webhook_configs',
        'webhook_branch_mappings',
        'users',
    ];

    public function up(): void
    {
        foreach (self::TABLES as $table) {
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->uuid('uuid')->nullable()->after('id');
            });

            foreach (DB::table($table)->pluck('id') as $id) {
                DB::table($table)->where('id', $id)->update(['uuid' => (string) Str::uuid()]);
            }

            // Reste nullable au niveau SQL (on évite un ALTER ... MODIFY qui
            // nécessiterait doctrine/dbal) : l'unicité + le hook de création
            // sur chaque modèle garantissent qu'il est toujours renseigné.
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->unique('uuid');
            });
        }
    }

    public function down(): void
    {
        foreach (self::TABLES as $table) {
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->dropColumn('uuid');
            });
        }
    }
};
