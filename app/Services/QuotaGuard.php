<?php

namespace App\Services;

use App\Models\Workspace;
use Illuminate\Support\Facades\Cache;

/**
 * Applique les quotas du plan effectif d'un workspace (Workspace::effectivePlan()).
 * Deux dimensions seulement : nombre d'applications, et concurrence de
 * déploiement — volontairement pas de limite mensuelle en nombre de
 * déploiements (décision produit).
 */
class QuotaGuard
{
    public static function concurrencyKey(int $workspaceId): string
    {
        return "deploy:concurrency:{$workspaceId}";
    }

    /**
     * @throws ApplicationQuotaExceededException
     */
    public function assertCanCreateApplication(Workspace $workspace): void
    {
        $limit = $workspace->effectivePlan()->max_applications;

        if ($limit !== null && $workspace->applications()->count() >= $limit) {
            throw new ApplicationQuotaExceededException(
                "Limite de {$limit} application(s) atteinte pour le plan actuel — passez au plan supérieur pour en créer davantage."
            );
        }
    }

    /**
     * Réserve un slot de déploiement concurrent pour ce workspace. À libérer
     * impérativement via releaseDeploymentSlot() une fois le déploiement
     * terminé (succès, échec ou annulation) — voir RunDeploymentJob.
     *
     * @throws DeploymentConcurrencyExceededException
     */
    public function acquireDeploymentSlot(Workspace $workspace): void
    {
        $limit = $workspace->effectivePlan()->max_concurrent_deployments;

        if ($limit === null) {
            return;
        }

        $key = self::concurrencyKey($workspace->id);
        $current = Cache::increment($key);

        if ($current > $limit) {
            $this->releaseDeploymentSlot($workspace);

            throw new DeploymentConcurrencyExceededException(
                "Limite de {$limit} déploiement(s) simultané(s) atteinte pour le plan actuel."
            );
        }
    }

    public function releaseDeploymentSlot(Workspace $workspace): void
    {
        if ($workspace->effectivePlan()->max_concurrent_deployments === null) {
            return;
        }

        $key = self::concurrencyKey($workspace->id);
        $current = Cache::decrement($key);

        // Cache::decrement peut créer la clé à -1 si elle n'existait pas déjà
        // (implémentation Redis) : on la nettoie pour éviter qu'elle traîne.
        if ($current !== false && $current <= 0) {
            Cache::forget($key);
        }
    }
}
