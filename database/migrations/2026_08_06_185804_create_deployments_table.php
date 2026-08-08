<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('deployments', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('target_environment_id')->constrained()->cascadeOnDelete();
            $table->string('status')->default('pending'); // pending|running|succes|echec|annule
            $table->string('trigger_source')->default('manual'); // manual|webhook|scheduled
            $table->foreignId('triggered_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('cancelled_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('commit_sha')->nullable();
            $table->string('branch')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->unsignedInteger('duration_ms')->nullable();
            $table->timestamps();

            $table->index(['target_environment_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('deployments');
    }
};
