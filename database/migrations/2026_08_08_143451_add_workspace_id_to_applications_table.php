<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('applications', function (Blueprint $table) {
            $table->foreignId('workspace_id')->nullable()->after('id')->constrained('workspaces')->cascadeOnDelete();
        });

        Schema::table('applications', function (Blueprint $table) {
            $table->dropUnique(['slug']);
            $table->unique(['workspace_id', 'slug']);
        });
    }

    public function down(): void
    {
        Schema::table('applications', function (Blueprint $table) {
            $table->dropUnique(['workspace_id', 'slug']);
            $table->unique('slug');
            $table->dropConstrainedForeignId('workspace_id');
        });
    }
};
