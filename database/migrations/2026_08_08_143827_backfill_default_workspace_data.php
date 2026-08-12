<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Données de développement uniquement (pré-lancement) : toutes les applications
     * existantes sont rattachées à un unique Workspace par défaut. Pour chaque
     * utilisateur, le rôle le plus élevé qu'il détenait sur n'importe quelle
     * application devient son rôle (unique) sur ce workspace ; l'accès qu'il avait
     * à chaque application est préservé via la nouvelle table application_user.
     */
    public function up(): void
    {
        if (! DB::table('applications')->exists()) {
            return;
        }

        $workspaceId = DB::table('workspaces')->insertGetId([
            'uuid' => (string) Str::uuid(),
            'name' => 'Workspace par défaut',
            'slug' => 'default',
            'created_by' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('applications')->whereNull('workspace_id')->update(['workspace_id' => $workspaceId]);

        match (DB::getDriverName()) {
            'pgsql' => DB::statement('ALTER TABLE applications ALTER COLUMN workspace_id SET NOT NULL'),
            'sqlite' => null,
            default => DB::statement('ALTER TABLE applications MODIFY workspace_id BIGINT UNSIGNED NOT NULL'),
        };

        $membershipRows = DB::table('model_has_roles')
            ->where('model_type', 'App\\Models\\User')
            ->get(['role_id', 'model_id', 'workspace_id']);

        // La colonne workspace_id contient encore, à ce stade, les anciens
        // identifiants d'application (simple renommage de colonne) : on les
        // récupère pour peupler application_user avant de les écraser.
        $accessRows = $membershipRows
            ->map(fn ($row) => ['application_id' => $row->workspace_id, 'user_id' => $row->model_id, 'created_at' => now(), 'updated_at' => now()])
            ->unique(fn ($row) => $row['application_id'].':'.$row['user_id'])
            ->values()
            ->all();

        if (! empty($accessRows)) {
            DB::table('application_user')->insertOrIgnore($accessRows);
        }

        $rolePriority = ['owner' => 4, 'manager' => 3, 'deployer' => 2, 'viewer' => 1];
        $roleNameById = DB::table('roles')->pluck('name', 'id');

        $bestRolePerUser = [];
        foreach ($membershipRows as $row) {
            $roleName = $roleNameById[$row->role_id] ?? null;
            if (! $roleName) {
                continue;
            }
            $current = $bestRolePerUser[$row->model_id] ?? null;
            if (! $current || ($rolePriority[$roleName] ?? 0) > ($rolePriority[$current] ?? 0)) {
                $bestRolePerUser[$row->model_id] = $roleName;
            }
        }

        DB::table('model_has_roles')->where('model_type', 'App\\Models\\User')->delete();

        $roleIdByName = DB::table('roles')->pluck('id', 'name');
        $newRows = [];
        foreach ($bestRolePerUser as $userId => $roleName) {
            if (! isset($roleIdByName[$roleName])) {
                continue;
            }
            $newRows[] = [
                'role_id' => $roleIdByName[$roleName],
                'model_type' => 'App\\Models\\User',
                'model_id' => $userId,
                'workspace_id' => $workspaceId,
            ];
        }

        if (! empty($newRows)) {
            DB::table('model_has_roles')->insert($newRows);
        }
    }

    public function down(): void
    {
        // Migration de données non réversible (dev uniquement).
    }
};
