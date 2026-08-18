<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->unsignedInteger('max_workspaces')->nullable()->default(1)->after('max_applications');
        });

        // Plan free → 1 workspace max. Plans payants → illimité (null).
        DB::table('plans')->where('slug', 'free')->update(['max_workspaces' => 1]);
        DB::table('plans')->where('slug', '!=', 'free')->update(['max_workspaces' => null]);
    }

    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->dropColumn('max_workspaces');
        });
    }
};
