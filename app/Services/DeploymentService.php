<?php

namespace App\Services;

use App\Jobs\RunDeploymentJob;
use App\Models\Deployment;
use App\Models\TargetEnvironment;
use App\Models\User;
use Illuminate\Support\Facades\Cache;

class DeploymentService
{
    public static function lockKey(int $targetEnvironmentId): string
    {
        return "deploy:lock:{$targetEnvironmentId}";
    }

    /**
     * @throws DeploymentAlreadyRunningException
     */
    public function trigger(
        TargetEnvironment $targetEnvironment,
        string $source,
        ?User $user = null,
        ?string $commitSha = null,
        ?string $branch = null,
    ): Deployment {
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

        $targetEnvironment->loadMissing('target.pipelineSteps');

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
                'command_snapshot' => $step->command,
                'order' => $index,
                'status' => 'pending',
            ]);
        }

        RunDeploymentJob::dispatch($deployment->id)->onQueue(config('deploy.queue'));

        return $deployment;
    }
}
