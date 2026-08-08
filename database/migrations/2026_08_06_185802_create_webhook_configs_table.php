<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('webhook_configs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('target_id')->constrained()->cascadeOnDelete();
            $table->string('provider'); // github | gitlab | bitbucket
            $table->text('secret');
            $table->boolean('enabled')->default(true);
            $table->timestamps();

            $table->unique(['target_id', 'provider']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('webhook_configs');
    }
};
