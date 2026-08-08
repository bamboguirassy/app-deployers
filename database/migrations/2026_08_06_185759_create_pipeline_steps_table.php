<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pipeline_steps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('target_id')->constrained()->cascadeOnDelete();
            $table->string('label');
            $table->text('command');
            $table->unsignedInteger('order')->default(0);
            $table->unsignedInteger('timeout_seconds')->nullable();
            $table->boolean('continue_on_failure')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pipeline_steps');
    }
};
