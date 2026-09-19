<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('target_environments', function (Blueprint $table) {
            $table->foreignId('ftp_credential_id')->nullable()->after('server_id')
                ->constrained('server_credentials')->nullOnDelete();
            $table->foreignId('sftp_credential_id')->nullable()->after('ftp_credential_id')
                ->constrained('server_credentials')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('target_environments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('ftp_credential_id');
            $table->dropConstrainedForeignId('sftp_credential_id');
        });
    }
};
