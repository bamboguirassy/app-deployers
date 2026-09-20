<?php

namespace App\Services;

use App\Models\Deployment;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Support\Facades\Cache;

/**
 * Applique les quotas du plan effectif d'un workspace (Workspace::effectivePlan()).
 * Deux dimensions seulement : nombre d'applications, et concurrence de
 * déploiement — volontairement pas de limite mensuelle en nombre de
 * déploiements (décision produit).
 */
class QuotaGuard
{
    /**
     * Verrou court sérialisant le "compte puis réserve" entre workers
     * concurrents (voir claimDeploymentSlot).
     */
    public static function concurrencyLockKey(int $workspaceId): string
    {
        return "deploy:concurrency-claim:{$workspaceId}";
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
     * Réserve un slot de déploiement concurrent pour ce workspace en faisant
     * passer $deployment en "running" — les deux opérations sont atomiques
     * (verrou court), sans quoi deux workers pourraient compter le même
     * "0 déploiement en cours" et démarrer tous les deux.
     *
     * Le nombre de slots consommés est **dérivé** des déploiements réellement
     * en statut "running" plutôt que d'un compteur Redis maintenu à la main.
     * Contexte : ce compteur (clé `deploy:concurrency:{id}`, sans TTL) était
     * incrémenté avant le try de RunDeploymentJob et décrémenté dans son
     * finally — tout worker tué entre les deux (ex. une étape de pipeline
     * auto-déployante qui fait `horizon:terminate`) fuitait un slot
     * **définitivement**, et une fois le plafond atteint plus aucun
     * déploiement du workspace ne démarrait : ils bouclaient en "pending"
     * jusqu'à expiration de retryUntil(). Dériver l'état de la base rend la
     * chose auto-réparante : un worker tué laisse un déploiement "running"
     * que deploy:reconcile-stuck repasse en échec, ce qui libère le slot.
     *
     * @throws DeploymentConcurrencyExceededException
     */
    public function claimDeploymentSlot(Workspace $workspace, Deployment $deployment): void
    {
        $limit = $workspace->effectivePlan()->max_concurrent_deployments;

        if ($limit === null) {
            $this->markRunning($deployment);

            return;
        }

        // block() relâche lui-même le verrou dans son propre finally, y
        // compris quand le callback lève (slot indisponible).
        try {
            Cache::lock(self::concurrencyLockKey($workspace->id), 10)->block(5, function () use ($workspace, $deployment, $limit) {
                if ($this->runningDeploymentCount($workspace) >= $limit) {
                    throw new DeploymentConcurrencyExceededException(
                        "Limite de {$limit} déploiement(s) simultané(s) atteinte pour le plan actuel."
                    );
                }

                $this->markRunning($deployment);
            });
        } catch (LockTimeoutException) {
            // Un autre worker du même workspace est en train de réserver :
            // on traite ça comme "pas de slot maintenant", le job se remet
            // simplement en file comme dans le cas nominal.
            throw new DeploymentConcurrencyExceededException(
                'Réservation de slot de déploiement momentanément indisponible.'
            );
        }
    }

    /**
     * Déploiements actuellement en cours d'exécution sur l'ensemble des
     * applications du workspace.
     */
    public function runningDeploymentCount(Workspace $workspace): int
    {
        return Deployment::query()
            ->where('status', 'running')
            ->whereHas(
                'targetEnvironment.target.application',
                fn ($query) => $query->where('workspace_id', $workspace->id),
            )
            ->count();
    }

    private function markRunning(Deployment $deployment): void
    {
        $deployment->update(['status' => 'running', 'started_at' => now()]);
    }
}
