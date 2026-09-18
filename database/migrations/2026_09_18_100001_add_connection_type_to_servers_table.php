<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('servers', function (Blueprint $table) {
            // ssh_exec (défaut, comportement actuel — pipeline exécuté à distance) |
            // ssh_rsync (build centralisé, sync via rsync par-dessus SSH) |
            // sftp (build centralisé, sync fichier par fichier via SFTP) |
            // ftp (build centralisé, sync fichier par fichier via FTP/FTPS)
            $table->string('connection_type')->default('ssh_exec')->after('auth_method');
        });
    }

    public function down(): void
    {
        Schema::table('servers', function (Blueprint $table) {
            $table->dropColumn('connection_type');
        });
    }
};
