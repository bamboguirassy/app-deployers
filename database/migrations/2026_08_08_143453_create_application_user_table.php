<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Association binaire (sans rôle) entre un utilisateur et une application :
     * le rôle vient uniquement du workspace, ceci ne détermine que la visibilité.
     */
    public function up(): void
    {
        Schema::create('application_user', function (Blueprint $table) {
            $table->foreignId('application_id')->constrained('applications')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->primary(['application_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('application_user');
    }
};
