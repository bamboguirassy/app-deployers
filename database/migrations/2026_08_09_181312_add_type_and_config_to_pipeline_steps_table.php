<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pipeline_steps', function (Blueprint $table) {
            $table->string('type')->default('command')->after('label');
            $table->json('config')->nullable()->after('type');
        });

        DB::table('pipeline_steps')->select('id', 'command')->orderBy('id')->each(function ($row) {
            DB::table('pipeline_steps')->where('id', $row->id)->update([
                'config' => json_encode(['command' => $row->command]),
            ]);
        });

        Schema::table('pipeline_steps', function (Blueprint $table) {
            $table->dropColumn('command');
        });
    }

    public function down(): void
    {
        Schema::table('pipeline_steps', function (Blueprint $table) {
            $table->text('command')->nullable()->after('type');
        });

        DB::table('pipeline_steps')->select('id', 'config')->orderBy('id')->each(function ($row) {
            $config = json_decode($row->config, true) ?? [];
            DB::table('pipeline_steps')->where('id', $row->id)->update([
                'command' => $config['command'] ?? '',
            ]);
        });

        Schema::table('pipeline_steps', function (Blueprint $table) {
            $table->dropColumn(['type', 'config']);
        });
    }
};
