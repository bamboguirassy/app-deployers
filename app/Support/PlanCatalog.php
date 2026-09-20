<?php

namespace App\Support;

use App\Models\Plan;

/**
 * Forme unique sous laquelle un plan et ses limites sont exposés au front —
 * page tarifs publique comme page de facturation.
 *
 * Contexte : les limites étaient recopiées à la main en trois endroits
 * (`BillingController`, et en dur dans les libellés de `constants/marketing.ts`
 * côté front), ce qui avait déjà divergé de la base en production — /tarifs
 * annonçait 5 déploiements simultanés pour le plan Pro alors que 3 étaient
 * réellement appliqués. Les limites vivent désormais en base (modifiables via
 * `AdminPlanController`) et ne sont plus écrites qu'ici.
 */
class PlanCatalog
{
    /**
     * @return array{free: array<string, mixed>|null, pro: array<string, mixed>|null}
     */
    public static function publicPlans(): array
    {
        return [
            'free' => self::present(Plan::query()->where('slug', 'free')->first()),
            'pro' => self::present(Plan::query()->where('slug', 'pro')->first()),
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    public static function present(?Plan $plan): ?array
    {
        if (! $plan) {
            return null;
        }

        return [
            'slug' => $plan->slug,
            'name' => $plan->name,
            'max_applications' => $plan->max_applications,
            'max_concurrent_deployments' => $plan->max_concurrent_deployments,
            'max_workspaces' => $plan->max_workspaces,
        ];
    }
}
