<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('frameworks', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('category'); // backend, frontend, fullstack, static, cms, mobile...
            $table->string('logo_url');
            $table->unsignedInteger('order')->default(0);
            $table->timestamps();
        });

        Schema::table('targets', function (Blueprint $table) {
            $table->foreignId('framework_id')->nullable()->after('application_id')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('targets', function (Blueprint $table) {
            $table->dropConstrainedForeignId('framework_id');
        });

        Schema::dropIfExists('frameworks');
    }
};
