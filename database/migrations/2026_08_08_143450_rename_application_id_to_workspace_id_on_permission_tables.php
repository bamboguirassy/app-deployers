<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Les rôles Spatie deviennent portés par le Workspace plutôt que par
     * l'Application : la colonne "team" des tables permission passe donc
     * de application_id à workspace_id (voir config/permission.php).
     *
     * Idempotent : sur une base fraîche (tests, nouvelle installation),
     * create_permission_tables lit déjà la config à jour et crée directement
     * la colonne workspace_id — il n'y a alors rien à renommer.
     */
    public function up(): void
    {
        foreach (['roles', 'model_has_roles', 'model_has_permissions'] as $table) {
            if (Schema::hasColumn($table, 'application_id') && ! Schema::hasColumn($table, 'workspace_id')) {
                Schema::table($table, function (Blueprint $blueprint) {
                    $blueprint->renameColumn('application_id', 'workspace_id');
                });
            }
        }
    }

    public function down(): void
    {
        foreach (['roles', 'model_has_roles', 'model_has_permissions'] as $table) {
            if (Schema::hasColumn($table, 'workspace_id') && ! Schema::hasColumn($table, 'application_id')) {
                Schema::table($table, function (Blueprint $blueprint) {
                    $blueprint->renameColumn('workspace_id', 'application_id');
                });
            }
        }
    }
};
