<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('servers', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->string('name');
            $table->string('host');
            $table->unsignedInteger('port')->default(22);
            $table->string('username');
            $table->string('auth_method'); // password | ssh_key
            $table->text('password')->nullable();
            $table->text('private_key')->nullable();
            $table->text('passphrase')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['workspace_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('servers');
    }
};
