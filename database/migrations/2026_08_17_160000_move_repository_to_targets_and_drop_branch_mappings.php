<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Add repository to targets
        Schema::table('targets', function (Blueprint $table) {
            $table->string('repository')->nullable()->after('slug');
        });

        // 2. Migrate existing repository values from webhook_configs to targets
        DB::table('webhook_configs')
            ->whereNotNull('repository')
            ->get(['target_id', 'repository'])
            ->groupBy('target_id')
            ->each(function ($configs, $targetId) {
                DB::table('targets')->where('id', $targetId)->update([
                    'repository' => $configs->first()->repository,
                ]);
            });

        // 3. Remove repository from webhook_configs
        Schema::table('webhook_configs', function (Blueprint $table) {
            $table->dropColumn('repository');
        });

        // 4. Drop webhook_branch_mappings (no longer needed — branches are matched
        //    directly from target_environments.git_branch at webhook receive time)
        Schema::dropIfExists('webhook_branch_mappings');
    }

    public function down(): void
    {
        Schema::create('webhook_branch_mappings', function (Blueprint $table) {
            $table->id();
            $table->uuid()->unique();
            $table->foreignId('webhook_config_id')->constrained()->cascadeOnDelete();
            $table->foreignId('environment_id')->constrained()->cascadeOnDelete();
            $table->string('branch');
            $table->timestamps();
        });

        Schema::table('webhook_configs', function (Blueprint $table) {
            $table->string('repository')->nullable()->after('provider');
        });

        Schema::table('targets', function (Blueprint $table) {
            $table->dropColumn('repository');
        });
    }
};
