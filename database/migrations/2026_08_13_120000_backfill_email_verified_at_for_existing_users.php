<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * MustVerifyEmail is being enabled on the User model in this release. Without
 * this backfill, every account created before this migration would have a
 * null email_verified_at and get locked out of the `verified`-gated routes
 * (dashboard, /admin) on their next visit.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('users')->whereNull('email_verified_at')->update([
            'email_verified_at' => now(),
        ]);
    }

    public function down(): void
    {
        // Non réversible : on ne peut pas distinguer les comptes réellement
        // vérifiés de ceux backfillés par cette migration.
    }
};
