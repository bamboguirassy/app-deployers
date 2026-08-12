<?php

namespace App\StepActions;

use App\Models\DeploymentStep;
use App\Models\TargetEnvironment;
use Illuminate\Support\Facades\Cache;
use phpseclib3\Net\SSH2;
use Symfony\Component\Process\Process;
use Throwable;

class CommandStepAction implements StepActionContract
{
    public static function type(): string
    {
        return 'command';
    }

    public static function rules(): array
    {
        return [
            'command' => ['required', 'string', 'max:2000'],
        ];
    }

    public function execute(
        DeploymentStep $step,
        TargetEnvironment $targetEnvironment,
        array $env,
        array $context,
        ?SSH2 $ssh,
        string $cancelKey,
        int $timeoutSeconds,
        ?callable $onOutput = null,
    ): StepExecutionResult {
        $command = (string) ($step->config_snapshot['command'] ?? '');

        return $ssh
            ? $this->runRemote($ssh, $command, $targetEnvironment, $env, $cancelKey, $timeoutSeconds, $onOutput)
            : $this->runLocal($step, $command, $targetEnvironment, $env, $cancelKey, $timeoutSeconds, $onOutput);
    }

    private function runLocal(
        DeploymentStep $step,
        string $command,
        TargetEnvironment $targetEnvironment,
        array $env,
        string $cancelKey,
        int $timeout,
        ?callable $onOutput,
    ): StepExecutionResult {
        $process = Process::fromShellCommandline(
            $command,
            $targetEnvironment->deploy_path,
            $env,
            null,
            $timeout,
        );

        $output = '';
        $cancelled = false;

        try {
            $process->start(function (string $type, string $buffer) use (&$output, $onOutput) {
                $output .= $buffer;

                if ($onOutput !== null) {
                    $onOutput($buffer);
                }
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

        return new StepExecutionResult($output, $exitCode, $cancelled);
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
     */
    private function runRemote(
        SSH2 $ssh,
        string $command,
        TargetEnvironment $targetEnvironment,
        array $env,
        string $cancelKey,
        int $timeout,
        ?callable $onOutput,
    ): StepExecutionResult {
        $exports = collect($env)
            ->map(fn ($value, $key) => 'export '.$key.'='.escapeshellarg((string) $value).';')
            ->implode(' ');

        $remoteCommand = trim($exports.' cd '.escapeshellarg($targetEnvironment->deploy_path).' && '.$command);

        $output = '';
        $cancelled = false;

        try {
            $ssh->setTimeout($timeout);

            $ssh->exec($remoteCommand, function (string $chunk) use (&$output, &$cancelled, $cancelKey, $onOutput) {
                $output .= $chunk;

                if ($onOutput !== null) {
                    $onOutput($chunk);
                }

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

        return new StepExecutionResult($output, $exitCode, $cancelled);
    }
}
