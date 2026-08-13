<?php

namespace App\Jobs;

use App\Events\DeploymentStatusUpdated;
use App\Events\DeploymentStepOutputAppended;
use App\Events\DeploymentStepUpdated;
use App\Models\Deployment;
use App\Models\DeploymentStep;
use App\Models\TargetEnvironment;
use App\Services\DeploymentConcurrencyExceededException;
use App\Services\DeploymentService;
use App\Services\QuotaGuard;
use App\Services\SshAuthenticator;
use App\StepActions\StepActionRegistry;
use App\Support\DeploymentContextBuilder;
use DateTimeInterface;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use phpseclib3\Net\SSH2;
use Throwable;

class RunDeploymentJob implements ShouldQueue
{
    use Queueable;

    public function __construct(public int $deploymentId)
    {
        $this->onQueue(config('deploy.queue'));
    }

    /**
     * Filet de sécurité pour la boucle d'attente de slot de concurrence
     * (voir handle()) — prime sur $tries : au-delà, le job est considéré
     * définitivement échoué et failed() ci-dessous marque le déploiement
     * en conséquence plutôt que de le laisser bloqué en "pending".
     */
    public function retryUntil(): DateTimeInterface
    {
        return now()->addMinutes(config('deploy.queue_wait_timeout_minutes'));
    }

    public function handle(SshAuthenticator $sshAuthenticator, QuotaGuard $quotaGuard, StepActionRegistry $stepActions): void
    {
        $deployment = Deployment::with([
            'steps',
            'targetEnvironment.target.application.workspace',
            'targetEnvironment.environment',
            'targetEnvironment.variables',
            'targetEnvironment.server',
        ])->find($this->deploymentId);

        if (! $deployment) {
            return;
        }

        $targetEnvironment = $deployment->targetEnvironment;
        $applicationId = $targetEnvironment->target->application_id;
        $workspace = $targetEnvironment->target->application->workspace;
        $workspaceId = $workspace->id;
        $cancelKey = self::cancelKey($deployment->id);

        // Le déploiement peut avoir été annulé alors qu'il était encore en
        // file d'attente d'un slot — pas besoin d'attendre pour rien.
        if (Cache::get($cancelKey)) {
            $this->cancelWhileQueued($deployment, $targetEnvironment, $applicationId, $workspaceId, $cancelKey);

            return;
        }

        try {
            $quotaGuard->acquireDeploymentSlot($workspace);
        } catch (DeploymentConcurrencyExceededException) {
            // Aucun slot de déploiement simultané disponible pour ce
            // workspace : on se remet en file plutôt que d'échouer — le
            // déploiement reste visible en "pending" (file d'attente).
            $this->release(config('deploy.concurrency_retry_seconds'));

            return;
        }

        $ssh = null;

        try {
            $deployment->update(['status' => 'running', 'started_at' => now()]);
            broadcast(new DeploymentStatusUpdated($applicationId, $workspaceId, $deployment));

            $env = $targetEnvironment->variables->pluck('value', 'key')->all();

            // Une seule connexion SSH ouverte pour tout le déploiement (pas une par
            // étape) : on évite de payer la poignée de main SSH à chaque commande.
            if ($targetEnvironment->server) {
                $ssh = $sshAuthenticator->connect($targetEnvironment->server);
            }

            $aborted = false;

            foreach ($deployment->steps as $step) {
                if ($aborted) {
                    $step->update(['status' => 'skipped']);
                    broadcast(new DeploymentStepUpdated($applicationId, $workspaceId, $step));

                    continue;
                }

                if (Cache::get($cancelKey)) {
                    $step->update(['status' => 'annule']);
                    broadcast(new DeploymentStepUpdated($applicationId, $workspaceId, $step));
                    $deployment->update(['status' => 'annule']);
                    $aborted = true;

                    continue;
                }

                $this->runStep($step, $deployment, $targetEnvironment, $env, $ssh, $cancelKey, $applicationId, $workspaceId, $stepActions);

                if ($step->status === 'annule') {
                    $deployment->update(['status' => 'annule']);
                    $aborted = true;
                } elseif ($step->status === 'echec' && ! $step->pipelineStep?->continue_on_failure) {
                    $aborted = true;
                }
            }

            $deployment->refresh();

            if ($deployment->status !== 'annule') {
                $hasFailure = DeploymentStep::where('deployment_id', $deployment->id)
                    ->where('status', 'echec')
                    ->exists();

                $deployment->update(['status' => $hasFailure ? 'echec' : 'succes']);
            }
        } catch (Throwable $e) {
            Log::error('Deployment failed with an unhandled exception', [
                'deployment_id' => $deployment->id,
                'error' => $e->getMessage(),
            ]);

            foreach ($deployment->steps as $step) {
                if (in_array($step->status, ['pending', 'running'], true)) {
                    $step->update(['status' => 'skipped']);
                    broadcast(new DeploymentStepUpdated($applicationId, $workspaceId, $step));
                }
            }

            $deployment->update(['status' => 'echec']);
        } finally {
            $deployment->refresh();
            $finishedAt = now();
            $deployment->update([
                'finished_at' => $finishedAt,
                'duration_ms' => $deployment->started_at
                    ? (int) $deployment->started_at->diffInMilliseconds($finishedAt)
                    : null,
            ]);
            broadcast(new DeploymentStatusUpdated($applicationId, $workspaceId, $deployment));
            Cache::forget($cancelKey);
            Cache::forget(DeploymentService::lockKey($targetEnvironment->id));
            $quotaGuard->releaseDeploymentSlot($workspace);
            $ssh?->disconnect();
        }
    }

    /**
     * Délègue l'exécution réelle au StepAction correspondant au type du
     * step (commande shell, email, ...) — ce job n'a besoin de connaître ni
     * la liste des types existants ni leur logique d'exécution.
     */
    private function runStep(
        DeploymentStep $step,
        Deployment $deployment,
        TargetEnvironment $targetEnvironment,
        array $env,
        ?SSH2 $ssh,
        string $cancelKey,
        int $applicationId,
        int $workspaceId,
        StepActionRegistry $stepActions,
    ): void {
        $step->update(['status' => 'running', 'started_at' => now()]);
        broadcast(new DeploymentStepUpdated($applicationId, $workspaceId, $step));

        $pipelineStep = $step->pipelineStep;
        $timeout = $pipelineStep?->timeout_seconds ?? config('deploy.default_timeout_seconds');
        $context = DeploymentContextBuilder::build($deployment, $step);

        $result = $stepActions->get($step->type)->execute(
            $step,
            $targetEnvironment,
            $env,
            $context,
            $ssh,
            $cancelKey,
            $timeout,
            $this->throttledOutputBroadcaster($applicationId, $step),
        );

        $finishedAt = now();
        $durationMs = (int) $step->started_at->diffInMilliseconds($finishedAt);
        $status = $result->status();

        $step->update([
            'status' => $status,
            'exit_code' => $result->exitCode,
            'output' => $this->truncate($result->output),
            'finished_at' => $finishedAt,
            'duration_ms' => $durationMs,
        ]);

        $errorExcerpt = $status === 'echec'
            ? $this->truncate($result->output, config('deploy.error_excerpt_length'))
            : null;

        broadcast(new DeploymentStepUpdated($applicationId, $workspaceId, $step, $errorExcerpt));
    }

    /**
     * Bufferise la sortie incrémentale d'un step et ne broadcast qu'au plus
     * toutes les 400ms (ou dès que le buffer dépasse la taille max d'un
     * morceau) — sans ce throttle, une commande très verbeuse (ex:
     * `npm install`) saturerait Reverb d'un événement par ligne. Le reliquat
     * du buffer en dessous du seuil au moment où le step se termine n'est
     * jamais flush : acceptable, la sortie complète reste disponible via
     * DeploymentStepUpdated.
     *
     * Le flush découpe systématiquement en morceaux bornés (boucle, pas un
     * simple if) : un chunk reçu d'un coup peut largement dépasser la taille
     * seuil à lui seul (ex: rafale de logs d'un `npm run build`) — sans cette
     * boucle, il partait en un seul broadcast dépassant la taille de payload
     * max acceptée par Reverb (`REVERB_MAX_REQUEST_SIZE`), rejeté côté client
     * avec "Pusher error: Payload too large".
     */
    private function throttledOutputBroadcaster(int $applicationId, DeploymentStep $step): callable
    {
        $buffer = '';
        $lastBroadcastAt = 0.0;
        $maxChunkSize = 4000;

        $flush = function () use (&$buffer, $applicationId, $step, $maxChunkSize) {
            while ($buffer !== '') {
                $piece = mb_substr($buffer, 0, $maxChunkSize);
                $buffer = mb_substr($buffer, mb_strlen($piece));
                broadcast(new DeploymentStepOutputAppended($applicationId, $step->deployment_id, $step->id, $piece));
            }
        };

        return function (string $chunk) use (&$buffer, &$lastBroadcastAt, $flush, $maxChunkSize) {
            $buffer .= $chunk;
            $now = microtime(true);

            if ($now - $lastBroadcastAt < 0.4 && mb_strlen($buffer) < $maxChunkSize) {
                return;
            }

            $flush();
            $lastBroadcastAt = $now;
        };
    }

    private function truncate(string $text, int $limit = 200_000): string
    {
        if (mb_strlen($text) <= $limit) {
            return $text;
        }

        return mb_substr($text, 0, $limit)."\n[…sortie tronquée…]";
    }

    public static function cancelKey(int $deploymentId): string
    {
        return "deploy:cancel:{$deploymentId}";
    }

    /**
     * Annulation d'un déploiement encore en file d'attente de slot — aucune
     * étape n'a démarré, on ne fait donc que marquer le statut et libérer les
     * verrous (pas de connexion SSH à fermer, pas de slot de concurrence à
     * relâcher puisqu'il n'a jamais été acquis).
     */
    private function cancelWhileQueued(Deployment $deployment, TargetEnvironment $targetEnvironment, int $applicationId, int $workspaceId, string $cancelKey): void
    {
        $deployment->update(['status' => 'annule', 'finished_at' => now()]);
        broadcast(new DeploymentStatusUpdated($applicationId, $workspaceId, $deployment));
        Cache::forget($cancelKey);
        Cache::forget(DeploymentService::lockKey($targetEnvironment->id));
    }

    /**
     * Appelé par Laravel quand le job échoue définitivement — ici quasi
     * toujours parce que retryUntil() a expiré alors que le déploiement
     * attendait encore un slot de concurrence disponible (aucun slot n'a
     * donc jamais été acquis, pas besoin de le relâcher).
     */
    public function failed(?Throwable $exception): void
    {
        $deployment = Deployment::with(['targetEnvironment.target.application.workspace', 'targetEnvironment.environment'])->find($this->deploymentId);

        if (! $deployment || in_array($deployment->status, ['succes', 'echec', 'annule'], true)) {
            return;
        }

        Log::warning('Deployment abandoned: no concurrency slot became available before the queue wait timeout', [
            'deployment_id' => $deployment->id,
        ]);

        $targetEnvironment = $deployment->targetEnvironment;
        $deployment->update(['status' => 'echec', 'finished_at' => now()]);
        broadcast(new DeploymentStatusUpdated(
            $targetEnvironment->target->application_id,
            $targetEnvironment->target->application->workspace_id,
            $deployment,
        ));
        Cache::forget(self::cancelKey($deployment->id));
        Cache::forget(DeploymentService::lockKey($targetEnvironment->id));
    }
}
