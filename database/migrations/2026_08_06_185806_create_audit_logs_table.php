<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            // Nullable dès la création : les entrées du panneau super-admin
            // (voir App\Support\PlatformAuditLogger) ne sont rattachées à
            // aucune application. Une migration plus tardive rendait cette
            // colonne nullable après coup via ALTER COLUMN — mais SQLite ne
            // supporte pas ALTER COLUMN et gardait la contrainte NOT NULL
            // envers et contre tout, cassant PlatformAuditLogger sous les
            // tests (voir tests/Feature/Admin/AdminWorkspaceDestroyTest.php).
            // Nullable de base évite ce problème sur tous les drivers.
            $table->foreignId('application_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action');
            $table->string('subject_type');
            $table->unsignedBigInteger('subject_id');
            $table->json('changes')->nullable();
            $table->string('ip_address')->nullable();
            $table->timestamps();

            $table->index(['application_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
