<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Insère les plans free/pro (idempotent, indépendant du seeder pour rester
 * jouable en production sans passer par `db:seed`), puis crée la Subscription
 * "free" manquante pour chaque workspace créé avant cette feature.
 */
return new class extends Migration
{
    public function up(): void
    {
        $now = now();

        DB::table('plans')->insertOrIgnore([
            [
                'slug' => 'free',
                'name' => 'Free',
                'max_applications' => 1,
                'max_concurrent_deployments' => 1,
                'paddle_price_id' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'slug' => 'pro',
                'name' => 'Pro',
                'max_applications' => null,
                'max_concurrent_deployments' => 5,
                'paddle_price_id' => env('PADDLE_PRO_PRICE_ID'),
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);

        $freePlanId = DB::table('plans')->where('slug', 'free')->value('id');

        $workspaceIdsWithoutSubscription = DB::table('workspaces')
            ->whereNotIn('id', DB::table('subscriptions')->select('workspace_id'))
            ->pluck('id');

        $rows = $workspaceIdsWithoutSubscription->map(fn ($workspaceId) => [
            'workspace_id' => $workspaceId,
            'plan_id' => $freePlanId,
            'status' => 'active',
            'created_at' => $now,
            'updated_at' => $now,
        ])->all();

        if (! empty($rows)) {
            DB::table('subscriptions')->insert($rows);
        }
    }

    public function down(): void
    {
        // Volontairement no-op : on ne supprime pas de données de facturation au rollback.
    }
};
