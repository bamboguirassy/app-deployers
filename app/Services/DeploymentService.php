<?php

namespace App\Services;

use App\Jobs\RunDeploymentJob;
use App\Models\Deployment;
use App\Models\TargetEnvironment;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class DeploymentService
{
    /**
     * Vérifie que toutes les TargetVariable sans default_value ont une valeur
     * renseignée pour cet environnement. Lance une exception si ce n'est pas
     * le cas — on ne veut pas démarrer un déploiement avec des variables vides.
     */
    private function assertVariablesComplete(TargetEnvironment $targetEnvironment): void
    {
        $definedIds = $targetEnvironment->variables->pluck('target_variable_id')->all();

        $missing = $targetEnvironment->target->variables
            ->filter(fn ($v) => $v->default_value === null && ! in_array($v->id, $definedIds))
            ->pluck('key');

        if ($missing->isNotEmpty()) {
            Cache::forget(self::lockKey($targetEnvironment->id));

            throw new MissingEnvironmentVariablesException(
                'Variables manquantes pour cet environnement : '.$missing->join(', ').'.'
            );
        }
    }

    public static function lockKey(int $targetEnvironmentId): string
    {
        return "deploy:lock:{$targetEnvironmentId}";
    }

    /**
     * Crée toujours le déploiement et le dispatch immédiatement — la
     * concurrence de plan (QuotaGuard::acquireDeploymentSlot) n'est plus
     * vérifiée ici mais au démarrage du job (RunDeploymentJob::handle), qui
     * se remet en file plutôt que d'échouer si aucun slot n'est disponible.
     *
     * @throws DeploymentAlreadyRunningException
     * @throws TargetEnvironmentMissingServerException
     */
    public function trigger(
        TargetEnvironment $targetEnvironment,
        string $source,
        ?User $user = null,
        ?string $commitSha = null,
        ?string $branch = null,
    ): Deployment {
        if (! $targetEnvironment->server_id) {
            throw new TargetEnvironmentMissingServerException(
                'Aucun serveur configuré pour cet environnement — configurez-en un avant de déployer.'
            );
        }

        $acquired = Cache::add(
            self::lockKey($targetEnvironment->id),
            true,
            now()->addMinutes(config('deploy.lock_ttl_minutes')),
        );

        if (! $acquired) {
            throw new DeploymentAlreadyRunningException(
                'Un déploiement est déjà en cours pour cet environnement.'
            );
        }

        $targetEnvironment->loadMissing(
            'target.pipelineSteps',
            'target.application.workspace',
            'target.variables',
            'variables',
        );

        $this->assertVariablesComplete($targetEnvironment);

        $deployment = Deployment::create([
            'target_environment_id' => $targetEnvironment->id,
            'status' => 'pending',
            'trigger_source' => $source,
            'triggered_by_user_id' => $user?->id,
            'commit_sha' => $commitSha,
            'branch' => $branch ?? $targetEnvironment->git_branch,
        ]);

        foreach ($targetEnvironment->target->pipelineSteps as $index => $step) {
            $deployment->steps()->create([
                'pipeline_step_id' => $step->id,
                'label_snapshot' => $step->label,
                'type' => $step->type,
                'config_snapshot' => $step->config,
                'order' => $index,
                'status' => 'pending',
            ]);
        }

        RunDeploymentJob::dispatch($deployment->id)->onQueue(config('deploy.queue'));

        return $deployment;
    }

    /**
     * Reprend un déploiement en échec à partir de sa première étape en
     * échec, en conservant l'historique des étapes déjà réussies (contexte :
     * évite de rejouer inutilement des étapes longues/coûteuses déjà
     * passées). Réutilise le même Deployment/DeploymentStep — contrairement
     * à trigger(), aucun nouveau Deployment n'est créé.
     *
     * @throws DeploymentAlreadyRunningException
     * @throws DeploymentNotResumableException
     */
    public function resumeFromFailure(Deployment $deployment): Deployment
    {
        if ($deployment->status !== 'echec') {
            throw new DeploymentNotResumableException(
                'Seul un déploiement en échec peut être repris.'
            );
        }

        if (! $deployment->isLatestForTargetEnvironment()) {
            throw new DeploymentNotResumableException(
                'Un déploiement plus récent existe sur cet environnement — impossible de reprendre celui-ci.'
            );
        }

        $targetEnvironmentId = $deployment->target_environment_id;

        $acquired = Cache::add(
            self::lockKey($targetEnvironmentId),
            true,
            now()->addMinutes(config('deploy.lock_ttl_minutes')),
        );

        if (! $acquired) {
            throw new DeploymentAlreadyRunningException(
                'Un déploiement est déjà en cours pour cet environnement.'
            );
        }

        DB::transaction(function () use ($deployment) {
            $steps = $deployment->steps()->orderBy('order')->get();
            $firstFailureOrder = $steps->firstWhere('status', 'echec')?->order;

            foreach ($steps as $step) {
                if ($step->order < $firstFailureOrder || $step->status === 'succes') {
                    continue;
                }

                $step->update([
                    'status' => 'pending',
                    'exit_code' => null,
                    'output' => null,
                    'pid' => null,
                    'started_at' => null,
                    'finished_at' => null,
                    'duration_ms' => null,
                ]);
            }

            $deployment->update([
                'status' => 'pending',
                'finished_at' => null,
                'duration_ms' => null,
            ]);
        });

        RunDeploymentJob::dispatch($deployment->id)->onQueue(config('deploy.queue'));

        return $deployment;
    }
}
