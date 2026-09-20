<?php

namespace App\Services;

use App\Events\DeploymentStatusUpdated;
use App\Jobs\RunDeploymentJob;
use App\Models\Deployment;
use App\Models\TargetEnvironment;
use App\Models\User;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class DeploymentService
{
    /**
     * Diffuse la création du déploiement, pour que la bande « déploiement en
     * cours » apparaisse dès le clic plutôt qu'au démarrage effectif du job.
     *
     * `DeploymentStatusUpdated` est `ShouldBroadcastNow` : l'envoi à Reverb
     * est synchrone, ici dans le cycle de la requête HTTP. Si Reverb est
     * indisponible, `event()` lève — et le déclenchement échouerait alors que
     * le déploiement est déjà créé et le job déjà dispatché, laissant un
     * déploiement fantôme et un message d'erreur trompeur. Même règle que
     * dans RunDeploymentJob : un souci de diffusion temps réel ne dégrade
     * jamais la fiabilité du déploiement.
     */
    private function broadcastCreation(Deployment $deployment, TargetEnvironment $targetEnvironment): void
    {
        try {
            $application = $targetEnvironment->target->application;

            event(new DeploymentStatusUpdated($application->id, $application->workspace_id, $deployment));
        } catch (Throwable $e) {
            Log::warning('Deployment creation broadcast failed — the UI will catch up on next render', [
                'deployment_id' => $deployment->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

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
            throw new MissingEnvironmentVariablesException(
                'Variables manquantes pour cet environnement : '.$missing->join(', ').'.'
            );
        }
    }

    /**
     * Un step `clone` (App\StepActions\CloneStepAction) sans dépôt connecté
     * échouerait de toute façon dès la première étape — autant le refuser
     * avant de créer un Deployment et de consommer un slot, plutôt que de
     * laisser échouer après coup (même principe que assertVariablesComplete()).
     * GitCloner::clone() garde son propre contrôle en filet de sécurité
     * (ex. dépôt déconnecté entre ce contrôle et l'exécution réelle du job).
     */
    private function assertRepositoryConnectedIfCloneStepPresent(TargetEnvironment $targetEnvironment): void
    {
        $target = $targetEnvironment->target;
        $hasCloneStep = $target->pipelineStepsFor($targetEnvironment)->get()->contains(fn ($step) => $step->type === 'clone');

        if ($hasCloneStep && (! $target->repository || ! $target->repository_provider)) {
            throw new MissingRepositoryException(
                'Ce pipeline contient une étape de clone, mais aucun dépôt Git n\'est connecté sur ce target.'
            );
        }
    }

    /**
     * Refuse le déploiement avant même de créer le Deployment si un step
     * `command`/`sync` présent dans le pipeline résolu pour cet environnement
     * n'a pas les moyens de s'exécuter : SSH manquant sur le serveur (command,
     * sync ssh_rsync, ou sync sftp sans compte SFTP dédié en repli), ou aucun
     * compte FTP dédié pour un sync ftp (jamais de repli possible, voir
     * FtpTransport). Même principe que assertRepositoryConnectedIfCloneStepPresent() :
     * un échec évident vaut mieux avant qu'après avoir consommé un slot.
     */
    private function assertTransportRequirementsAreMet(TargetEnvironment $targetEnvironment): void
    {
        $server = $targetEnvironment->server;
        $steps = $targetEnvironment->target->pipelineStepsFor($targetEnvironment)->get();

        foreach ($steps as $step) {
            $missing = match (true) {
                $step->type === 'command' => ! $server->hasSsh(),
                $step->type === 'sync' && ($step->config['transport'] ?? null) === 'ssh_rsync' => ! $server->hasSsh(),
                $step->type === 'sync' && ($step->config['transport'] ?? null) === 'sftp' => ! $server->hasSsh() && ! $targetEnvironment->sftp_credential_id,
                $step->type === 'sync' && ($step->config['transport'] ?? null) === 'ftp' => ! $targetEnvironment->ftp_credential_id,
                default => false,
            };

            if ($missing) {
                throw new MissingTransportCredentialsException(
                    "L'étape « {$step->label} » ne peut pas s'exécuter sur cet environnement : accès manquant (SSH ou compte FTP/SFTP dédié)."
                );
            }
        }
    }

    /**
     * Verrou court sérialisant le « vérifie puis crée » d'un même
     * environnement entre requêtes concurrentes. Il ne représente PAS
     * l'occupation de l'environnement (voir assertNoActiveDeployment) : sa
     * seule raison d'être est d'empêcher deux déclenchements simultanés de
     * constater tous les deux « aucun déploiement en cours ».
     */
    public static function triggerLockKey(int $targetEnvironmentId): string
    {
        return "deploy:trigger:{$targetEnvironmentId}";
    }

    /**
     * Un seul déploiement à la fois par couple cible/environnement — deux
     * pipelines concurrents travailleraient dans le même `deploy_path` sur le
     * serveur cible (git pull, composer install, build...), et rien ne
     * rattraperait l'état incohérent qui en résulterait.
     *
     * L'occupation est **dérivée** des déploiements réellement non terminés,
     * et non d'une clé de cache à durée de vie. Contexte : la clé
     * `deploy:lock:{id}` avait un TTL de 20 minutes, n'était jamais
     * rafraîchie, et expirait donc aussi bien pendant l'attente d'un slot
     * (jusqu'à `queue_wait_timeout_minutes`, 2 h) que **pendant l'exécution**
     * d'un déploiement plus long que 20 minutes — un simple pipeline de deux
     * étapes au timeout par défaut suffit. Passé ce délai, la protection
     * cessait silencieusement de fonctionner.
     *
     * Auto-réparant : un worker tué laisse un déploiement `running` ou
     * `pending` que `deploy:reconcile-stuck` finit par abandonner, ce qui
     * libère l'environnement sans intervention manuelle.
     *
     * @throws DeploymentAlreadyRunningException
     */
    private function assertNoActiveDeployment(int $targetEnvironmentId): void
    {
        $active = Deployment::query()
            ->where('target_environment_id', $targetEnvironmentId)
            ->whereIn('status', ['pending', 'running'])
            ->exists();

        if ($active) {
            throw new DeploymentAlreadyRunningException(
                'Un déploiement est déjà en cours pour cet environnement.'
            );
        }
    }

    /**
     * Exécute $work en garantissant qu'aucun autre déclenchement ne puisse
     * s'intercaler sur le même environnement.
     *
     * @template T
     *
     * @param  callable(): T  $work
     * @return T
     *
     * @throws DeploymentAlreadyRunningException
     */
    private function withTriggerLock(int $targetEnvironmentId, callable $work)
    {
        try {
            return Cache::lock(self::triggerLockKey($targetEnvironmentId), 15)->block(5, $work);
        } catch (LockTimeoutException) {
            // Un autre déclenchement est en cours sur ce même environnement :
            // du point de vue de l'appelant, c'est exactement « déjà en cours ».
            throw new DeploymentAlreadyRunningException(
                'Un déploiement est déjà en cours pour cet environnement.'
            );
        }
    }

    /**
     * Crée toujours le déploiement et le dispatch immédiatement — la
     * concurrence de plan (QuotaGuard::claimDeploymentSlot) n'est plus
     * vérifiée ici mais au démarrage du job (RunDeploymentJob::handle), qui
     * se remet en file plutôt que d'échouer si aucun slot n'est disponible.
     *
     * @throws DeploymentAlreadyRunningException
     * @throws TargetEnvironmentMissingServerException
     * @throws MissingRepositoryException
     * @throws MissingTransportCredentialsException
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

        $targetEnvironment->loadMissing(
            'target.application.workspace',
            'target.variables',
            'variables',
            'server',
        );

        $this->assertRepositoryConnectedIfCloneStepPresent($targetEnvironment);
        $this->assertTransportRequirementsAreMet($targetEnvironment);
        $this->assertVariablesComplete($targetEnvironment);

        // Vérification d'occupation et création dans la même section critique :
        // sans ça, deux déclenchements simultanés constateraient tous les deux
        // « aucun déploiement en cours ».
        $deployment = $this->withTriggerLock($targetEnvironment->id, function () use ($targetEnvironment, $source, $user, $commitSha, $branch) {
            $this->assertNoActiveDeployment($targetEnvironment->id);

            $deployment = Deployment::create([
                'target_environment_id' => $targetEnvironment->id,
                'status' => 'pending',
                'trigger_source' => $source,
                'triggered_by_user_id' => $user?->id,
                'commit_sha' => $commitSha,
                'branch' => $branch ?? $targetEnvironment->git_branch,
            ]);

            $steps = $targetEnvironment->target->pipelineStepsFor($targetEnvironment)->get();

            foreach ($steps as $index => $step) {
                $deployment->steps()->create([
                    'pipeline_step_id' => $step->id,
                    'label_snapshot' => $step->label,
                    'type' => $step->type,
                    'config_snapshot' => $step->config,
                    'order' => $index,
                    'status' => 'pending',
                ]);
            }

            return $deployment;
        });

        RunDeploymentJob::dispatch($deployment->id)->onQueue(config('deploy.queue'));
        $this->broadcastCreation($deployment, $targetEnvironment);

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

        $this->withTriggerLock($targetEnvironmentId, function () use ($deployment, $targetEnvironmentId) {
            // Ce déploiement est en "echec" : il ne se compte pas lui-même.
            $this->assertNoActiveDeployment($targetEnvironmentId);

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
                    'queued_reason' => null,
                    'finished_at' => null,
                    'duration_ms' => null,
                ]);
            });
        });

        RunDeploymentJob::dispatch($deployment->id)->onQueue(config('deploy.queue'));
        $this->broadcastCreation($deployment, $deployment->targetEnvironment);

        return $deployment;
    }
}
