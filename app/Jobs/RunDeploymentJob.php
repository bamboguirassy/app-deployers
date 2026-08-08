<?php

namespace App\Jobs;

use App\Events\DeploymentStatusUpdated;
use App\Events\DeploymentStepUpdated;
use App\Models\Deployment;
use App\Models\DeploymentStep;
use App\Models\TargetEnvironment;
use App\Services\DeploymentService;
use App\Services\SshAuthenticator;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use phpseclib3\Net\SSH2;
use Symfony\Component\Process\Process;
use Throwable;

class RunDeploymentJob implements ShouldQueue
{
    use Queueable;

    public $tries = 1;

    public function __construct(public int $deploymentId)
    {
        $this->onQueue(config('deploy.queue'));
    }

    public function handle(SshAuthenticator $sshAuthenticator): void
    {
        $deployment = Deployment::with(['steps', 'targetEnvironment.target.application', 'targetEnvironment.variables', 'targetEnvironment.server'])
            ->find($this->deploymentId);

        if (! $deployment) {
            return;
        }

        $targetEnvironment = $deployment->targetEnvironment;
        $applicationId = $targetEnvironment->target->application_id;
        $cancelKey = self::cancelKey($deployment->id);
        $ssh = null;

        try {
            $deployment->update(['status' => 'running', 'started_at' => now()]);
            broadcast(new DeploymentStatusUpdated($applicationId, $deployment));

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
                    broadcast(new DeploymentStepUpdated($applicationId, $step));

                    continue;
                }

                if (Cache::get($cancelKey)) {
                    $step->update(['status' => 'annule']);
                    broadcast(new DeploymentStepUpdated($applicationId, $step));
                    $deployment->update(['status' => 'annule']);
                    $aborted = true;

                    continue;
                }

                $this->runStep($step, $targetEnvironment, $env, $ssh, $cancelKey, $applicationId);

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
            broadcast(new DeploymentStatusUpdated($applicationId, $deployment));
            Cache::forget($cancelKey);
            Cache::forget(DeploymentService::lockKey($targetEnvironment->id));
            $ssh?->disconnect();
        }
    }

    private function runStep(
        DeploymentStep $step,
        TargetEnvironment $targetEnvironment,
        array $env,
        ?SSH2 $ssh,
        string $cancelKey,
        int $applicationId,
    ): void {
        $step->update(['status' => 'running', 'started_at' => now()]);
        broadcast(new DeploymentStepUpdated($applicationId, $step));

        $pipelineStep = $step->pipelineStep;
        $timeout = $pipelineStep?->timeout_seconds ?? config('deploy.default_timeout_seconds');

        [$output, $exitCode, $cancelled] = $ssh
            ? $this->runRemoteStep($ssh, $step, $targetEnvironment, $env, $cancelKey, $timeout)
            : $this->runLocalStep($step, $targetEnvironment, $env, $cancelKey, $timeout);

        $finishedAt = now();
        $durationMs = (int) $step->started_at->diffInMilliseconds($finishedAt);

        $status = match (true) {
            $cancelled => 'annule',
            $exitCode === 0 => 'succes',
            default => 'echec',
        };

        $step->update([
            'status' => $status,
            'exit_code' => $exitCode,
            'output' => $this->truncate($output),
            'finished_at' => $finishedAt,
            'duration_ms' => $durationMs,
        ]);

        $errorExcerpt = $status === 'echec'
            ? $this->truncate($output, config('deploy.error_excerpt_length'))
            : null;

        broadcast(new DeploymentStepUpdated($applicationId, $step, $errorExcerpt));
    }

    /**
     * @return array{0: string, 1: int, 2: bool} [output, exitCode, cancelled]
     */
    private function runLocalStep(
        DeploymentStep $step,
        TargetEnvironment $targetEnvironment,
        array $env,
        string $cancelKey,
        int $timeout,
    ): array {
        $process = Process::fromShellCommandline(
            $step->command_snapshot,
            $targetEnvironment->deploy_path,
            $env,
            null,
            $timeout,
        );

        $output = '';
        $cancelled = false;

        try {
            $process->start(function (string $type, string $buffer) use (&$output) {
                $output .= $buffer;
            });

            $step->update(['pid' => $process->getPid()]);

            while ($process->isRunning()) {
                if (Cache::get($cancelKey)) {
                    $process->stop(3, \SIGTERM);
                    $cancelled = true;
                    break;
                }
                usleep(250_000);
            }

            $exitCode = $process->wait();
        } catch (Throwable $e) {
            $output .= "\n".$e->getMessage();
            $exitCode = 1;
        }

        return [$output, $exitCode, $cancelled];
    }

    /**
     * Exécute la commande sur la connexion SSH déjà ouverte pour ce déploiement.
     * Les variables d'environnement sont injectées via des `export` (SSH ne
     * transmet pas l'environnement local).
     *
     * L'annulation n'est vérifiée qu'à la réception de nouvelles données —
     * comme pour l'exécution locale, c'est une annulation coopérative, pas
     * préemptive : une commande distante totalement silencieuse ne sera
     * interrompue qu'à sa prochaine sortie ou à sa fin. Fermer le canal ne
     * garantit pas non plus la fin du process distant s'il a été détaché
     * (ex: lancé en arrière-plan avec `&`) — même limitation que `kill` côté
     * local sur un process qui a lui-même forké.
     *
     * @return array{0: string, 1: int, 2: bool} [output, exitCode, cancelled]
     */
    private function runRemoteStep(
        SSH2 $ssh,
        DeploymentStep $step,
        TargetEnvironment $targetEnvironment,
        array $env,
        string $cancelKey,
        int $timeout,
    ): array {
        $exports = collect($env)
            ->map(fn ($value, $key) => 'export '.$key.'='.escapeshellarg((string) $value).';')
            ->implode(' ');

        $remoteCommand = trim($exports.' cd '.escapeshellarg($targetEnvironment->deploy_path).' && '.$step->command_snapshot);

        $output = '';
        $cancelled = false;

        try {
            $ssh->setTimeout($timeout);

            $ssh->exec($remoteCommand, function (string $chunk) use (&$output, &$cancelled, $cancelKey) {
                $output .= $chunk;

                if (Cache::get($cancelKey)) {
                    $cancelled = true;

                    return true; // abandonne la lecture et ferme le canal
                }

                return false;
            });

            $exitCode = $cancelled ? 143 : (int) ($ssh->getExitStatus() ?? 1);

            if (! $cancelled && $ssh->isTimeout()) {
                $output .= "\n[délai d'exécution dépassé (timeout SSH)]";
                $exitCode = 1;
            }
        } catch (Throwable $e) {
            $output .= "\n".$e->getMessage();
            $exitCode = 1;
        }

        return [$output, $exitCode, $cancelled];
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
}
