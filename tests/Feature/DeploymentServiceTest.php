<?php

namespace Tests\Feature;

use App\Jobs\RunDeploymentJob;
use App\Models\Application;
use App\Models\Deployment;
use App\Models\Environment;
use App\Models\PipelineStep;
use App\Models\Plan;
use App\Models\Server;
use App\Models\ServerCredential;
use App\Models\Target;
use App\Models\TargetEnvironment;
use App\Models\User;
use App\Models\Workspace;
use App\Services\DeploymentAlreadyRunningException;
use App\Services\DeploymentNotResumableException;
use App\Services\DeploymentService;
use App\Services\MissingRepositoryException;
use App\Services\MissingTransportCredentialsException;
use App\Services\TargetEnvironmentMissingServerException;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class DeploymentServiceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(PlanSeeder::class);
    }

    private function makeWorkspace(): Workspace
    {
        $workspace = Workspace::create(['name' => 'Acme']);
        $workspace->subscription()->create(['plan_id' => Plan::free()->id, 'status' => 'active']);

        return $workspace;
    }

    private function makeServer(Workspace $workspace): Server
    {
        return Server::create([
            'workspace_id' => $workspace->id,
            'name' => 'prod-1',
            'host' => '10.0.0.1',
            'username' => 'deploy',
            'auth_method' => 'password',
            'password' => 'secret',
        ]);
    }

    private function makeServerWithoutSsh(Workspace $workspace): Server
    {
        return Server::create([
            'workspace_id' => $workspace->id,
            'name' => 'ftp-only',
            'host' => '10.0.0.2',
        ]);
    }

    private function makeTargetEnvironment(Workspace $workspace, ?Server $server = null): TargetEnvironment
    {
        $application = Application::create([
            'workspace_id' => $workspace->id,
            'name' => 'API',
            'created_by' => User::factory()->create()->id,
        ]);
        $target = Target::create(['application_id' => $application->id, 'name' => 'API', 'slug' => 'api']);
        $environment = Environment::create(['application_id' => $application->id, 'name' => 'Prod', 'slug' => 'prod']);

        PipelineStep::create([
            'target_id' => $target->id,
            'label' => 'Deploy',
            'type' => 'command',
            'config' => ['command' => 'echo hi'],
            'order' => 0,
        ]);

        return TargetEnvironment::create([
            'target_id' => $target->id,
            'environment_id' => $environment->id,
            'server_id' => $server?->id,
            'deploy_path' => '/var/www/app',
            'git_branch' => 'main',
        ]);
    }

    public function test_trigger_fails_when_target_environment_has_no_server(): void
    {
        $targetEnvironment = $this->makeTargetEnvironment($this->makeWorkspace());

        $this->expectException(TargetEnvironmentMissingServerException::class);

        app(DeploymentService::class)->trigger($targetEnvironment, 'manual');
    }

    public function test_trigger_throws_when_a_command_step_targets_a_server_without_ssh(): void
    {
        $workspace = $this->makeWorkspace();
        $targetEnvironment = $this->makeTargetEnvironment($workspace, $this->makeServerWithoutSsh($workspace));

        $this->expectException(MissingTransportCredentialsException::class);

        app(DeploymentService::class)->trigger($targetEnvironment->fresh(), 'manual');
    }

    public function test_trigger_throws_when_a_sync_ftp_step_has_no_dedicated_ftp_credential(): void
    {
        $workspace = $this->makeWorkspace();
        $server = $this->makeServer($workspace);
        $targetEnvironment = $this->makeTargetEnvironment($workspace, $server);
        $targetEnvironment->pipelineSteps()->delete();

        PipelineStep::create([
            'target_id' => $targetEnvironment->target_id,
            'label' => 'Sync FTP',
            'type' => 'sync',
            'config' => ['transport' => 'ftp', 'local_path' => '', 'remote_path' => ''],
            'order' => 0,
        ]);

        $this->expectException(MissingTransportCredentialsException::class);

        app(DeploymentService::class)->trigger($targetEnvironment->fresh(), 'manual');
    }

    public function test_trigger_succeeds_for_sync_ftp_when_a_dedicated_credential_is_assigned(): void
    {
        Queue::fake();

        $workspace = $this->makeWorkspace();
        $server = $this->makeServer($workspace);
        $credential = ServerCredential::create([
            'server_id' => $server->id, 'type' => 'ftp', 'label' => 'FTP', 'username' => 'u', 'password' => 'p',
        ]);
        $targetEnvironment = $this->makeTargetEnvironment($workspace, $server);
        $targetEnvironment->update(['ftp_credential_id' => $credential->id]);
        $targetEnvironment->pipelineSteps()->delete();

        PipelineStep::create([
            'target_id' => $targetEnvironment->target_id,
            'label' => 'Sync FTP',
            'type' => 'sync',
            'config' => ['transport' => 'ftp', 'local_path' => '', 'remote_path' => ''],
            'order' => 0,
        ]);

        $deployment = app(DeploymentService::class)->trigger($targetEnvironment->fresh(), 'manual');

        $this->assertSame('pending', $deployment->status);
    }

    public function test_trigger_succeeds_for_sync_sftp_falling_back_to_the_server_ssh(): void
    {
        Queue::fake();

        $workspace = $this->makeWorkspace();
        $targetEnvironment = $this->makeTargetEnvironment($workspace, $this->makeServer($workspace));
        $targetEnvironment->pipelineSteps()->delete();

        PipelineStep::create([
            'target_id' => $targetEnvironment->target_id,
            'label' => 'Sync SFTP',
            'type' => 'sync',
            'config' => ['transport' => 'sftp', 'local_path' => '', 'remote_path' => ''],
            'order' => 0,
        ]);

        $deployment = app(DeploymentService::class)->trigger($targetEnvironment->fresh(), 'manual');

        $this->assertSame('pending', $deployment->status);
    }

    public function test_trigger_throws_when_a_sync_sftp_step_has_no_credential_and_no_server_ssh(): void
    {
        $workspace = $this->makeWorkspace();
        $targetEnvironment = $this->makeTargetEnvironment($workspace, $this->makeServerWithoutSsh($workspace));
        $targetEnvironment->pipelineSteps()->delete();

        PipelineStep::create([
            'target_id' => $targetEnvironment->target_id,
            'label' => 'Sync SFTP',
            'type' => 'sync',
            'config' => ['transport' => 'sftp', 'local_path' => '', 'remote_path' => ''],
            'order' => 0,
        ]);

        $this->expectException(MissingTransportCredentialsException::class);

        app(DeploymentService::class)->trigger($targetEnvironment->fresh(), 'manual');
    }

    public function test_trigger_throws_when_pipeline_has_a_clone_step_but_no_repository_is_connected(): void
    {
        $workspace = $this->makeWorkspace();
        $targetEnvironment = $this->makeTargetEnvironment($workspace, $this->makeServer($workspace));

        PipelineStep::create([
            'target_id' => $targetEnvironment->target_id,
            'label' => 'Cloner le dépôt',
            'type' => 'clone',
            'config' => [],
            'order' => 1,
        ]);

        $this->expectException(MissingRepositoryException::class);

        app(DeploymentService::class)->trigger($targetEnvironment->fresh(), 'manual');
    }

    public function test_a_rejected_trigger_does_not_leave_the_environment_blocked(): void
    {
        $workspace = $this->makeWorkspace();
        $targetEnvironment = $this->makeTargetEnvironment($workspace, $this->makeServer($workspace));

        PipelineStep::create([
            'target_id' => $targetEnvironment->target_id,
            'label' => 'Cloner le dépôt',
            'type' => 'clone',
            'config' => [],
            'order' => 1,
        ]);

        try {
            app(DeploymentService::class)->trigger($targetEnvironment->fresh(), 'manual');
        } catch (MissingRepositoryException) {
            // attendu
        }

        // L'occupation de l'environnement est dérivée des déploiements non
        // terminés : un déclenchement refusé n'en crée aucun, donc rien ne
        // reste à « libérer ».
        $this->assertSame(0, Deployment::where('target_environment_id', $targetEnvironment->id)->count());
    }

    public function test_trigger_succeeds_with_a_clone_step_when_a_repository_is_connected(): void
    {
        Queue::fake();

        $workspace = $this->makeWorkspace();
        $targetEnvironment = $this->makeTargetEnvironment($workspace, $this->makeServer($workspace));
        Target::find($targetEnvironment->target_id)->update([
            'repository' => 'octocat/Hello-World',
            'repository_provider' => 'github',
        ]);

        PipelineStep::create([
            'target_id' => $targetEnvironment->target_id,
            'label' => 'Cloner le dépôt',
            'type' => 'clone',
            'config' => [],
            'order' => 1,
        ]);

        $deployment = app(DeploymentService::class)->trigger($targetEnvironment->fresh(), 'manual');

        $this->assertSame('pending', $deployment->status);
    }

    public function test_trigger_snapshots_only_the_steps_of_the_targeted_environment_when_pipeline_is_not_uniform(): void
    {
        Queue::fake();

        $workspace = $this->makeWorkspace();
        $server = $this->makeServer($workspace);

        $application = Application::create([
            'workspace_id' => $workspace->id,
            'name' => 'API',
            'created_by' => User::factory()->create()->id,
        ]);
        $target = Target::create([
            'application_id' => $application->id,
            'name' => 'API',
            'slug' => 'api',
            'uniform_pipeline' => false,
        ]);
        $prodEnv = Environment::create(['application_id' => $application->id, 'name' => 'Prod', 'slug' => 'prod']);
        $stagingEnv = Environment::create(['application_id' => $application->id, 'name' => 'Staging', 'slug' => 'staging']);

        $prod = TargetEnvironment::create([
            'target_id' => $target->id,
            'environment_id' => $prodEnv->id,
            'server_id' => $server->id,
            'deploy_path' => '/var/www/prod',
            'git_branch' => 'main',
        ]);
        $staging = TargetEnvironment::create([
            'target_id' => $target->id,
            'environment_id' => $stagingEnv->id,
            'server_id' => $server->id,
            'deploy_path' => '/var/www/staging',
            'git_branch' => 'develop',
        ]);

        PipelineStep::create([
            'target_id' => $target->id,
            'target_environment_id' => $prod->id,
            'label' => 'Deploy prod',
            'type' => 'command',
            'config' => ['command' => 'echo prod'],
            'order' => 0,
        ]);
        PipelineStep::create([
            'target_id' => $target->id,
            'target_environment_id' => $staging->id,
            'label' => 'Deploy staging',
            'type' => 'command',
            'config' => ['command' => 'echo staging'],
            'order' => 0,
        ]);

        $deployment = app(DeploymentService::class)->trigger($prod->fresh(), 'manual');

        $this->assertSame(1, $deployment->steps()->count());
        $this->assertSame('Deploy prod', $deployment->steps()->first()->label_snapshot);
    }

    public function test_trigger_snapshots_pipeline_steps_and_dispatches_the_job(): void
    {
        Queue::fake();

        $workspace = $this->makeWorkspace();
        $targetEnvironment = $this->makeTargetEnvironment($workspace, $this->makeServer($workspace));

        $deployment = app(DeploymentService::class)->trigger($targetEnvironment, 'manual');

        $this->assertSame('pending', $deployment->status);
        $this->assertSame(1, $deployment->steps()->count());
        $this->assertSame('main', $deployment->branch);

        Queue::assertPushed(RunDeploymentJob::class, fn ($job) => $job->deploymentId === $deployment->id);
    }

    public function test_trigger_throws_when_a_deployment_is_already_running_for_the_target_environment(): void
    {
        Queue::fake();

        $workspace = $this->makeWorkspace();
        $targetEnvironment = $this->makeTargetEnvironment($workspace, $this->makeServer($workspace));

        app(DeploymentService::class)->trigger($targetEnvironment, 'manual');

        $this->expectException(DeploymentAlreadyRunningException::class);

        app(DeploymentService::class)->trigger($targetEnvironment, 'manual');
    }

    public function test_a_finished_deployment_frees_the_environment_for_a_new_one(): void
    {
        Queue::fake();

        $workspace = $this->makeWorkspace();
        $targetEnvironment = $this->makeTargetEnvironment($workspace, $this->makeServer($workspace));

        $first = app(DeploymentService::class)->trigger($targetEnvironment, 'manual');

        // Sortir d'un statut non terminal libère l'environnement : il n'y a
        // plus de verrou à relâcher séparément.
        $first->update(['status' => 'succes']);

        $second = app(DeploymentService::class)->trigger($targetEnvironment, 'manual');

        $this->assertNotSame($first->id, $second->id);
    }

    public function test_resume_from_failure_replays_only_the_failed_step_and_the_ones_after_it(): void
    {
        Queue::fake();

        $workspace = $this->makeWorkspace();
        $targetEnvironment = $this->makeTargetEnvironment($workspace, $this->makeServer($workspace));

        PipelineStep::create([
            'target_id' => $targetEnvironment->target_id,
            'label' => 'Test',
            'type' => 'command',
            'config' => ['command' => 'echo test'],
            'order' => 1,
        ]);
        PipelineStep::create([
            'target_id' => $targetEnvironment->target_id,
            'label' => 'Publish',
            'type' => 'command',
            'config' => ['command' => 'echo publish'],
            'order' => 2,
        ]);

        $deployment = app(DeploymentService::class)->trigger($targetEnvironment, 'manual');

        $steps = $deployment->steps()->orderBy('order')->get();
        $steps[0]->update(['status' => 'succes', 'exit_code' => 0]);
        $steps[1]->update(['status' => 'echec', 'exit_code' => 1, 'output' => 'boom']);
        $steps[2]->update(['status' => 'skipped']);
        $deployment->update(['status' => 'echec']);

        app(DeploymentService::class)->resumeFromFailure($deployment->fresh());

        $deployment->refresh();
        $steps = $deployment->steps()->orderBy('order')->get();

        $this->assertSame('succes', $steps[0]->status);
        $this->assertSame('pending', $steps[1]->status);
        $this->assertNull($steps[1]->exit_code);
        $this->assertSame('pending', $steps[2]->status);
        $this->assertSame('pending', $deployment->status);

        Queue::assertPushed(RunDeploymentJob::class, fn ($job) => $job->deploymentId === $deployment->id);
    }

    public function test_resume_from_failure_is_rejected_when_a_more_recent_deployment_exists(): void
    {
        Queue::fake();

        $workspace = $this->makeWorkspace();
        $targetEnvironment = $this->makeTargetEnvironment($workspace, $this->makeServer($workspace));

        $first = app(DeploymentService::class)->trigger($targetEnvironment, 'manual');
        $first->update(['status' => 'echec']);

        $second = app(DeploymentService::class)->trigger($targetEnvironment, 'manual');
        $second->update(['status' => 'succes']);

        $this->expectException(DeploymentNotResumableException::class);

        app(DeploymentService::class)->resumeFromFailure($first->fresh());
    }

    /**
     * Régression : l'occupation d'un environnement reposait sur une clé de
     * cache avec un TTL de 20 minutes, jamais rafraîchie. Passé ce délai, un
     * second déclenchement était accepté alors que le premier tournait
     * toujours — deux pipelines concurrents dans le même `deploy_path` du
     * serveur cible, sans rien pour rattraper l'état résultant. Un pipeline de
     * deux étapes au timeout par défaut (900 s) suffit à dépasser 20 minutes.
     */
    public function test_a_deployment_running_longer_than_the_old_lock_ttl_still_blocks_a_second_trigger(): void
    {
        Queue::fake();

        $workspace = $this->makeWorkspace();
        $targetEnvironment = $this->makeTargetEnvironment($workspace, $this->makeServer($workspace));

        $first = app(DeploymentService::class)->trigger($targetEnvironment, 'manual');
        $first->update(['status' => 'running', 'started_at' => now()]);

        $this->travel(45)->minutes();

        $this->expectException(DeploymentAlreadyRunningException::class);

        app(DeploymentService::class)->trigger($targetEnvironment->fresh(), 'manual');
    }

    /**
     * Même chose pour un déploiement qui patiente longuement en file
     * d'attente : l'ancien TTL de 20 minutes expirait bien avant
     * queue_wait_timeout_minutes (2 h).
     */
    public function test_a_deployment_queued_for_a_long_time_still_blocks_a_second_trigger(): void
    {
        Queue::fake();

        $workspace = $this->makeWorkspace();
        $targetEnvironment = $this->makeTargetEnvironment($workspace, $this->makeServer($workspace));

        $queued = app(DeploymentService::class)->trigger($targetEnvironment, 'manual');
        $queued->update(['queued_reason' => Deployment::QUEUED_FOR_CONCURRENCY]);

        $this->travel(90)->minutes();

        $this->expectException(DeploymentAlreadyRunningException::class);

        app(DeploymentService::class)->trigger($targetEnvironment->fresh(), 'manual');
    }
}
