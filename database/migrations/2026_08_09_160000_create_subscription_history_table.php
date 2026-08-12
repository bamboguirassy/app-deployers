<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('subscription_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->constrained()->cascadeOnDelete();
            $table->foreignId('plan_id')->nullable()->constrained()->nullOnDelete();
            $table->string('status');
            $table->string('interval')->nullable();
            // null quand le changement vient d'un webhook Paddle plutôt que d'un super-admin.
            $table->foreignId('changed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            // 'admin' | 'webhook' | 'system'
            $table->string('source')->default('system');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subscription_history');
    }
};
