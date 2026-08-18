<?php

namespace App\Services;

use App\Models\User;
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
     * Retourne le nombre de workspaces dont l'utilisateur est owner.
     */
    private function ownedWorkspaceCount(User $user): int
    {
        return $user->workspaces()
            ->wherePivot('workspace_id', '!=', null) // s'assure que la jointure est bien scopée
            ->get()
            ->filter(fn ($ws) => $user->isWorkspaceOwner($ws))
            ->count();
    }

    /**
     * Retourne la limite de workspaces applicable à cet utilisateur :
     * on prend le meilleur plan actif parmi tous ses workspaces (null = illimité).
     */
    private function workspaceLimitForUser(User $user): ?int
    {
        $plans = $user->workspaces()->get()->map(fn ($ws) => $ws->effectivePlan());

        // Si l'utilisateur a au moins un plan avec max_workspaces null → illimité
        if ($plans->contains(fn ($p) => $p->max_workspaces === null)) {
            return null;
        }

        // Sinon on prend la valeur maximale parmi les plans actifs
        return $plans->max('max_workspaces') ?? 1;
    }

    public function canCreateWorkspace(User $user): bool
    {
        $limit = $this->workspaceLimitForUser($user);

        if ($limit === null) {
            return true;
        }

        return $this->ownedWorkspaceCount($user) < $limit;
    }

    /**
     * @throws WorkspaceQuotaExceededException
     */
    public function assertCanCreateWorkspace(User $user): void
    {
        $limit = $this->workspaceLimitForUser($user);

        if ($limit !== null && $this->ownedWorkspaceCount($user) >= $limit) {
            throw new WorkspaceQuotaExceededException($limit);
        }
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
