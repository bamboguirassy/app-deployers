<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('target_environments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('target_id')->constrained()->cascadeOnDelete();
            $table->foreignId('environment_id')->constrained()->cascadeOnDelete();
            $table->string('deploy_path');
            $table->string('git_branch')->default('main');
            $table->timestamps();

            $table->unique(['target_id', 'environment_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('target_environments');
    }
};
