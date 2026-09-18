<?php

namespace App\StepActions;

use App\Models\DeploymentStep;
use App\Models\TargetEnvironment;
use App\Transports\TransportRegistry;
use phpseclib3\Net\SSH2;

/**
 * Step de pipeline ordinaire, choisi librement par l'utilisateur (comme
 * `command`/`email`) : pousse un sous-dossier du workspace local
 * (`context['workspace_path']`, voir CloneStepAction/DeploymentContextBuilder)
 * vers le serveur de l'environnement, via le transport choisi dans la
 * config du step — résolu par TransportRegistry, RunDeploymentJob n'a
 * besoin de rien connaître des transports.
 */
class SyncStepAction implements StepActionContract
{
    public function __construct(private TransportRegistry $transports) {}

    public static function type(): string
    {
        return 'sync';
    }

    public static function rules(): array
    {
        return [
            'transport' => ['required', 'in:ssh_rsync,sftp,ftp'],
            'local_path' => ['nullable', 'string', 'max:255'],
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
        $config = $step->config_snapshot ?? [];
        $transport = (string) ($config['transport'] ?? '');
        $relative = trim((string) ($config['local_path'] ?? ''), '/');
        $workspacePath = (string) ($context['workspace_path'] ?? '');

        if ($workspacePath === '' || $transport === '') {
            return new StepExecutionResult('Configuration de synchronisation invalide (workspace ou transport manquant).', 1);
        }

        $localPath = rtrim($workspacePath, '/').($relative !== '' ? '/'.$relative : '');

        $result = $this->transports->get($transport)->sync($localPath, $targetEnvironment, $cancelKey, $onOutput);

        return new StepExecutionResult($result->output, $result->success ? 0 : 1, $result->cancelled);
    }
}
