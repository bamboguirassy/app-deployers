<?php

namespace App\Console\Commands;

use App\Events\DeploymentStatusUpdated;
use App\Jobs\RunDeploymentJob;
use App\Models\Deployment;
use DateTimeInterface;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;

/**
 * Filet de sécurité pour les déploiements dont le job ne peut plus aboutir :
 * worker tué brutalement (OOM, kill -9, crash serveur) sans jamais atteindre
 * le bloc finally de RunDeploymentJob, ou job disparu de la file sans avoir
 * été exécuté. L'annulation coopérative existante (cache:cancel) ne couvre
 * pas ces cas : elle suppose que le job tourne encore pour lire le flag.
 *
 * Deux états sont réconciliés, avec des seuils distincts :
 *
 * - `running` au-delà de `deploy.stuck_running_after_minutes` : un worker a
 *   démarré l'exécution puis a disparu.
 * - `pending` au-delà de `deploy.stuck_pending_after_minutes` : le job n'a
 *   jamais tourné et n'existe plus (file Redis vidée, Horizon purgé), donc
 *   ni retryUntil() ni failed() ne s'appliqueront jamais. Le seuil est
 *   volontairement supérieur à `queue_wait_timeout_minutes` pour ne pas
 *   abandonner un déploiement qui attend encore légitimement un slot.
 *
 * Les deux comptent, parce que l'occupation d'un environnement
 * (DeploymentService::assertNoActiveDeployment) comme le slot de concurrence
 * du workspace (QuotaGuard) sont désormais dérivés des déploiements non
 * terminés : un déploiement fantôme bloque durablement tant qu'il n'est pas
 * résolu.
 */
#[Signature('deploy:reconcile-stuck')]
#[Description('Marque en échec les déploiements bloqués depuis trop longtemps (worker mort, job disparu) et débloque les environnements concernés')]
class ReconcileStuckDeployments extends Command
{
    public function handle(): void
    {
        $reconciled = $this->reconcile(
            'running',
            now()->subMinutes((int) config('deploy.stuck_running_after_minutes')),
            'bloqué en "running"',
        ) + $this->reconcile(
            'pending',
            now()->subMinutes((int) config('deploy.stuck_pending_after_minutes')),
            'resté "pending" sans job',
        );

        if ($reconciled === 0) {
            $this->info('Aucun déploiement bloqué détecté.');
        }
    }

    private function reconcile(string $status, DateTimeInterface $threshold, string $reason): int
    {
        $stuck = Deployment::query()
            ->where('status', $status)
            ->where('updated_at', '<', $threshold)
            ->with(['targetEnvironment.target.application.workspace', 'steps'])
            ->get();

        foreach ($stuck as $deployment) {
            $target = $deployment->targetEnvironment->target;
            $workspace = $target->application->workspace;

            foreach ($deployment->steps as $step) {
                if (in_array($step->status, ['pending', 'running'], true)) {
                    $step->update(['status' => 'annule']);
                }
            }

            $deployment->update(['status' => 'echec', 'finished_at' => now()]);

            event(new DeploymentStatusUpdated($target->application_id, $workspace->id, $deployment));

            Cache::forget(RunDeploymentJob::cancelKey($deployment->id));
            // Rien d'autre à libérer : l'occupation de l'environnement et le
            // slot de concurrence sont dérivés du statut, que le passage en
            // "echec" vient de résoudre.

            $this->warn("Déploiement #{$deployment->id} marqué en échec ({$reason} depuis {$deployment->updated_at}).");
        }

        return $stuck->count();
    }
}
