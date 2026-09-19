<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Rend username/auth_method nullable sans doctrine/dbal (absent de ce
 * projet) — Schema::table(...)->change() en dépend. SQL brut par driver
 * à la place ; MySQL en prod/dev, sqlite en tests (ALTER COLUMN direct,
 * pas de recréation de table nécessaire pour lever un NOT NULL).
 */
return new class extends Migration
{
    public function up(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'sqlite') {
            // sqlite n'a pas d'ALTER COLUMN — on réécrit directement la
            // définition NOT NULL stockée dans sqlite_master (suffisant ici :
            // aucun index/contrainte FK sur ces deux colonnes), puis on force
            // sqlite à reparser son schéma (le texte de sqlite_master seul
            // ne suffit pas : le schéma compilé est mis en cache par
            // connexion tant que schema_version n'a pas changé).
            DB::statement('PRAGMA writable_schema = 1');
            DB::statement("UPDATE sqlite_master SET sql = REPLACE(sql, '\"username\" varchar not null', '\"username\" varchar') WHERE type = 'table' AND name = 'servers'");
            DB::statement("UPDATE sqlite_master SET sql = REPLACE(sql, '\"auth_method\" varchar not null', '\"auth_method\" varchar') WHERE type = 'table' AND name = 'servers'");
            $version = (int) DB::selectOne('PRAGMA schema_version')->schema_version;
            DB::statement('PRAGMA schema_version = '.($version + 1));
            DB::statement('PRAGMA writable_schema = 0');

            return;
        }

        DB::statement('ALTER TABLE servers MODIFY username VARCHAR(255) NULL');
        DB::statement('ALTER TABLE servers MODIFY auth_method VARCHAR(255) NULL');
    }

    public function down(): void
    {
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'sqlite') {
            // Pas de retour arrière fiable en sqlite sans doctrine/dbal — un
            // rollback local recrée simplement la base via migrate:fresh.
            return;
        }

        DB::statement('ALTER TABLE servers MODIFY username VARCHAR(255) NOT NULL');
        DB::statement('ALTER TABLE servers MODIFY auth_method VARCHAR(255) NOT NULL');
    }
};
