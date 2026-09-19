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
            'remote_path' => ['nullable', 'string', 'max:255', function ($attribute, $value, $fail) {
                if ($value !== null && self::containsPathTraversal($value)) {
                    $fail('Le chemin distant ne peut pas contenir de traversée de répertoire ("..").');
                }
            }],
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
        $remotePath = trim((string) ($config['remote_path'] ?? ''), '/');
        $workspacePath = (string) ($context['workspace_path'] ?? '');

        if ($workspacePath === '' || $transport === '') {
            return new StepExecutionResult('Configuration de synchronisation invalide (workspace ou transport manquant).', 1);
        }

        // Défense en profondeur : la validation à la création du step
        // (rules() ci-dessus) devrait déjà avoir rejeté ceci, mais on ne fait
        // jamais confiance uniquement à une validation en amont pour un
        // chemin qui contrôle où on écrit sur le serveur du client.
        if (self::containsPathTraversal($remotePath)) {
            return new StepExecutionResult('remote_path invalide (traversée de répertoire détectée).', 1);
        }

        $localPath = rtrim($workspacePath, '/').($relative !== '' ? '/'.$relative : '');

        // deploy_path n'est jamais persisté ici — seulement lu par les
        // transports (App\Transports\*) comme destination distante. Cloner
        // l'objet pour n'en changer que cet attribut en mémoire permet de
        // rediriger la synchronisation vers un sous-dossier sans toucher au
        // contrat TransportContract ni aux 3 implémentations.
        $destinationEnvironment = $targetEnvironment;

        if ($remotePath !== '') {
            $destinationEnvironment = clone $targetEnvironment;
            $destinationEnvironment->deploy_path = rtrim($targetEnvironment->deploy_path, '/').'/'.$remotePath;
        }

        $result = $this->transports->get($transport)->sync($localPath, $destinationEnvironment, $cancelKey, $onOutput);

        return new StepExecutionResult($result->output, $result->success ? 0 : 1, $result->cancelled);
    }

    private static function containsPathTraversal(string $path): bool
    {
        $segments = explode('/', str_replace('\\', '/', $path));

        return in_array('..', $segments, true);
    }
}
