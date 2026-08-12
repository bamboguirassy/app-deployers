<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Un seul plan payant (Pro) mais deux cycles de facturation Paddle distincts
 * (mensuel/annuel), donc deux price_id — remplace la colonne unique
 * paddle_price_id qui ne portait aucune notion de cycle.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->string('paddle_price_id_monthly')->nullable()->after('paddle_price_id');
            $table->string('paddle_price_id_yearly')->nullable()->after('paddle_price_id_monthly');
        });

        Schema::table('plans', function (Blueprint $table) {
            $table->dropColumn('paddle_price_id');
        });
    }

    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->string('paddle_price_id')->nullable();
        });

        Schema::table('plans', function (Blueprint $table) {
            $table->dropColumn(['paddle_price_id_monthly', 'paddle_price_id_yearly']);
        });
    }
};
