<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('environment_variables', function (Blueprint $table) {
            $table->id();
            $table->foreignId('target_environment_id')->constrained()->cascadeOnDelete();
            $table->string('key');
            $table->text('value');
            $table->boolean('is_secret')->default(false);
            $table->timestamps();

            $table->unique(['target_environment_id', 'key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('environment_variables');
    }
};
