<?php

namespace App\StepActions;

use App\Models\DeploymentStep;
use App\Models\TargetEnvironment;
use App\Transports\TransportRegistry;
use phpseclib3\Net\SSH2;

/**
 * Step système injecté par DeploymentService::trigger() uniquement (jamais
 * créable manuellement par l'utilisateur — voir PipelineStepController, qui
 * exclut explicitement ce type des types autorisés en création). Synchronise
 * le build centralisé vers la cible réelle via TransportRegistry, résolue
 * par connection_type — RunDeploymentJob n'a besoin de rien connaître des
 * transports, exactement comme pour les autres StepActions.
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
        return [];
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
        // $targetEnvironment reçu ici peut être une copie dont deploy_path a
        // été redirigé vers le workspace de build local (voir
        // RunDeploymentJob::handle()) — la vraie destination de sync doit
        // toujours venir de la relation réelle, jamais de ce paramètre.
        $realTargetEnvironment = $step->deployment->targetEnvironment;

        $localPath = (string) ($step->config_snapshot['local_path'] ?? '');
        $connectionType = (string) ($step->config_snapshot['connection_type'] ?? '');

        if ($localPath === '' || $connectionType === '') {
            return new StepExecutionResult('Configuration de synchronisation manquante sur ce step système.', 1);
        }

        $result = $this->transports->get($connectionType)->sync($localPath, $realTargetEnvironment, $cancelKey, $onOutput);

        return new StepExecutionResult($result->output, $result->success ? 0 : 1, $result->cancelled);
    }
}
