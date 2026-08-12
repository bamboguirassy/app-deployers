<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('deployment_steps', function (Blueprint $table) {
            $table->string('type')->default('command')->after('label_snapshot');
            $table->json('config_snapshot')->nullable()->after('type');
        });

        DB::table('deployment_steps')->select('id', 'command_snapshot')->orderBy('id')->each(function ($row) {
            DB::table('deployment_steps')->where('id', $row->id)->update([
                'config_snapshot' => json_encode(['command' => $row->command_snapshot]),
            ]);
        });

        Schema::table('deployment_steps', function (Blueprint $table) {
            $table->dropColumn('command_snapshot');
        });
    }

    public function down(): void
    {
        Schema::table('deployment_steps', function (Blueprint $table) {
            $table->text('command_snapshot')->nullable()->after('type');
        });

        DB::table('deployment_steps')->select('id', 'config_snapshot')->orderBy('id')->each(function ($row) {
            $config = json_decode($row->config_snapshot, true) ?? [];
            DB::table('deployment_steps')->where('id', $row->id)->update([
                'command_snapshot' => $config['command'] ?? '',
            ]);
        });

        Schema::table('deployment_steps', function (Blueprint $table) {
            $table->dropColumn(['type', 'config_snapshot']);
        });
    }
};
