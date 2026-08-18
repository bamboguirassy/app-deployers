<?php

namespace App\Console\Commands;

use App\Events\DeploymentStatusUpdated;
use App\Jobs\RunDeploymentJob;
use App\Models\Deployment;
use App\Services\DeploymentService;
use App\Services\QuotaGuard;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;

/**
 * Filet de sécurité pour les déploiements "running"/"pending" dont le worker
 * a été tué brutalement (OOM, kill -9, crash serveur) sans jamais atteindre
 * le bloc finally de RunDeploymentJob — ils restent alors bloqués
 * indéfiniment (verrou target-environment posé, slot de concurrence
 * consommé, statut jamais résolu). L'annulation coopérative existante
 * (cache:cancel) ne couvre pas ce cas : elle suppose que le job tourne
 * encore pour lire le flag.
 *
 * "pending" est exclu ici : un déploiement en attente d'un slot de
 * concurrence est un état normal et transitoire, borné par
 * retryUntil()/failed() dans RunDeploymentJob (queue_wait_timeout_minutes).
 * Seul "running" — où on sait qu'un worker a démarré l'exécution — a besoin
 * de ce filet indépendant.
 */
#[Signature('deploy:reconcile-stuck')]
#[Description('Marque en échec les déploiements "running" bloqués depuis trop longtemps (worker mort) et libère verrous/slots associés')]
class ReconcileStuckDeployments extends Command
{
    public function handle(QuotaGuard $quotaGuard): void
    {
        $threshold = now()->subMinutes((int) config('deploy.stuck_running_after_minutes'));

        $stuck = Deployment::query()
            ->where('status', 'running')
            ->where('updated_at', '<', $threshold)
            ->with(['targetEnvironment.target.application.workspace', 'steps'])
            ->get();

        foreach ($stuck as $deployment) {
            $targetEnvironment = $deployment->targetEnvironment;
            $target = $targetEnvironment->target;
            $workspace = $target->application->workspace;

            foreach ($deployment->steps as $step) {
                if (in_array($step->status, ['pending', 'running'], true)) {
                    $step->update(['status' => 'annule']);
                }
            }

            $deployment->update(['status' => 'echec', 'finished_at' => now()]);

            event(new DeploymentStatusUpdated($target->application_id, $workspace->id, $deployment));

            Cache::forget(RunDeploymentJob::cancelKey($deployment->id));
            Cache::forget(DeploymentService::lockKey($targetEnvironment->id));
            $quotaGuard->releaseDeploymentSlot($workspace);

            $this->warn("Déploiement #{$deployment->id} marqué en échec (bloqué en \"running\" depuis {$deployment->updated_at}).");
        }

        if ($stuck->isEmpty()) {
            $this->info('Aucun déploiement bloqué détecté.');
        }
    }
}
