<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('target_variables', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('target_id')->constrained()->cascadeOnDelete();
            $table->string('key');
            $table->text('default_value')->nullable();
            $table->boolean('is_secret')->default(false);
            $table->unsignedInteger('order')->default(0);
            $table->timestamps();

            $table->unique(['target_id', 'key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('target_variables');
    }
};
