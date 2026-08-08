<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('deployment_steps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('deployment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('pipeline_step_id')->nullable()->constrained()->nullOnDelete();
            $table->string('label_snapshot');
            $table->text('command_snapshot');
            $table->unsignedInteger('order')->default(0);
            $table->string('status')->default('pending'); // pending|running|succes|echec|annule|skipped
            $table->integer('exit_code')->nullable();
            $table->mediumText('output')->nullable();
            $table->unsignedInteger('pid')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->unsignedInteger('duration_ms')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('deployment_steps');
    }
};
