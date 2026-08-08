<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('webhook_branch_mappings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('webhook_config_id')->constrained()->cascadeOnDelete();
            $table->foreignId('environment_id')->constrained()->cascadeOnDelete();
            $table->string('branch');
            $table->timestamps();

            $table->unique(['webhook_config_id', 'branch']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('webhook_branch_mappings');
    }
};
