<?php

namespace App\StepActions;

use App\Models\DeploymentStep;
use App\Models\TargetEnvironment;
use App\Services\GitCloner;
use Illuminate\Support\Facades\File;
use phpseclib3\Net\SSH2;
use Throwable;

/**
 * Step de pipeline ordinaire, choisi librement par l'utilisateur : clone le
 * dépôt du Target dans le workspace local du déploiement
 * (`context['workspace_path']`, voir DeploymentContextBuilder), pour que des
 * steps `sync` ultérieurs puissent en livrer tout ou partie vers la cible.
 * Aucune config utilisateur — branche/commit viennent du contexte du
 * déploiement (déjà résolus par DeploymentService::trigger()/le webhook).
 */
class CloneStepAction implements StepActionContract
{
    public function __construct(private GitCloner $gitCloner) {}

    public static function type(): string
    {
        return 'clone';
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
        $workspacePath = (string) ($context['workspace_path'] ?? '');

        if ($workspacePath === '') {
            return new StepExecutionResult('Chemin de workspace manquant.', 1);
        }

        File::ensureDirectoryExists($workspacePath);

        $branch = $context['deployment']['branch'] ?? $targetEnvironment->git_branch;
        $commitSha = $context['deployment']['commit_sha'] ?? null;

        try {
            $sha = $this->gitCloner->clone($targetEnvironment->target, $branch, $workspacePath, $commitSha);

            // Le déploiement peut avoir été déclenché sans commit_sha connu
            // (déclenchement manuel) — on fixe la valeur réellement clonée,
            // consommée ensuite par last_deployed_sha (RunDeploymentJob).
            if ($step->deployment->commit_sha === null) {
                $step->deployment->update(['commit_sha' => $sha]);
            }

            return new StepExecutionResult("Dépôt cloné (branche {$branch}, commit {$sha}).", 0);
        } catch (Throwable $e) {
            return new StepExecutionResult($e->getMessage(), 1);
        }
    }
}
