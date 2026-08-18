<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // La table est vide partout — pas de migration de données.
        //
        // En local : key/is_secret ont été supprimés par une migration partielle
        // qui a échoué avant d'enregistrer dans migrations ; on ne les redroppe pas.
        // En prod (PostgreSQL) : la table est intacte, on fait le drop complet.
        // Schema::hasColumn() permet de gérer les deux états sans erreur.

        if (Schema::hasColumn('environment_variables', 'key')) {
            Schema::table('environment_variables', function (Blueprint $table) {
                // Libérer la FK pour pouvoir supprimer l'index unique composite.
                $table->dropForeign(['target_environment_id']);
                $table->dropUnique('environment_variables_target_environment_id_key_unique');
                $table->dropColumn(['key', 'is_secret']);
                // Repose la FK (sans l'index unique qui vient d'être supprimé).
                $table->foreign('target_environment_id')
                    ->references('id')
                    ->on('target_environments')
                    ->cascadeOnDelete();
            });
        }

        Schema::table('environment_variables', function (Blueprint $table) {
            $table->foreignId('target_variable_id')
                ->after('target_environment_id')
                ->constrained()
                ->cascadeOnDelete();

            $table->unique(['target_environment_id', 'target_variable_id'], 'env_vars_te_tv_unique');
        });
    }

    public function down(): void
    {
        Schema::table('environment_variables', function (Blueprint $table) {
            // Libérer les deux FKs d'abord pour pouvoir supprimer l'index unique.
            $table->dropForeign(['target_variable_id']);
            $table->dropForeign(['target_environment_id']);
            $table->dropUnique('env_vars_te_tv_unique');
            $table->dropColumn('target_variable_id');
            // Restaurer les colonnes et contraintes d'origine.
            $table->string('key')->after('target_environment_id');
            $table->boolean('is_secret')->default(false)->after('value');
            $table->foreign('target_environment_id')
                ->references('id')
                ->on('target_environments')
                ->cascadeOnDelete();
            $table->unique(['target_environment_id', 'key'], 'environment_variables_target_environment_id_key_unique');
        });
    }
};
