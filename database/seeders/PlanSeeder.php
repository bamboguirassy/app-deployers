<?php

namespace Database\Seeders;

use App\Models\Plan;
use Illuminate\Database\Seeder;

class PlanSeeder extends Seeder
{
    /**
     * Valeurs de **démarrage** des plans, appliquées uniquement à la création.
     * La source de vérité ensuite, c'est la base : les limites sont
     * modifiables par un administrateur via `AdminPlanController` (avec audit
     * log), et la page tarifs publique comme la page de facturation les lisent
     * depuis la base (voir App\Support\PlanCatalog).
     */
    public const PLANS = [
        [
            'slug' => 'free',
            'name' => 'Free',
            'max_applications' => 2,
            'max_concurrent_deployments' => 1,
        ],
        [
            'slug' => 'pro',
            'name' => 'Pro',
            'max_applications' => null,
            'max_concurrent_deployments' => 3,
        ],
    ];

    public function run(): void
    {
        foreach (self::PLANS as $plan) {
            $paddleIds = [];

            if ($plan['slug'] === 'pro') {
                $paddleIds = [
                    'paddle_price_id_monthly' => config('paddle.pro_price_id_monthly'),
                    'paddle_price_id_yearly' => config('paddle.pro_price_id_yearly'),
                ];
            }

            $existing = Plan::query()->where('slug', $plan['slug'])->first();

            if (! $existing) {
                Plan::query()->create($plan + $paddleIds);

                continue;
            }

            // Volontairement : on ne réécrit PAS les limites d'un plan déjà
            // existant. Ce seeder tourne à chaque déploiement
            // (`php artisan db:seed --force` dans le pipeline) et un
            // updateOrCreate sur ces champs annulait silencieusement toute
            // limite ajustée depuis l'admin — l'administrateur voyait sa
            // modification appliquée, puis revenir en arrière au déploiement
            // suivant sans aucune trace. Seuls le libellé et les
            // identifiants de prix Paddle (qui, eux, viennent de la config
            // d'environnement) restent synchronisés ici.
            $existing->update(['name' => $plan['name']] + $paddleIds);
        }
    }
}
