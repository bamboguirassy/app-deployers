<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pipeline_steps', function (Blueprint $table) {
            $table->foreignId('target_environment_id')
                ->nullable()
                ->after('target_id')
                ->constrained('target_environments')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('pipeline_steps', function (Blueprint $table) {
            $table->dropConstrainedForeignId('target_environment_id');
        });
    }
};
