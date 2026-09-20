<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Distingue un déploiement qui attend un slot de concurrence (file d'attente
 * du plan) d'un déploiement "pending" ordinaire, qui ne l'est que le temps
 * que le worker le prenne — en général moins d'une seconde.
 *
 * Sans cette colonne, l'interface ne peut que déduire l'attente
 * (`pending` + quota saturé), ce qui étiquetterait « en file d'attente »
 * tous les démarrages normaux. L'information est écrite par RunDeploymentJob
 * au moment exact où le slot lui est refusé.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('deployments', function (Blueprint $table) {
            $table->string('queued_reason')->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('deployments', function (Blueprint $table) {
            $table->dropColumn('queued_reason');
        });
    }
};
