<?php

namespace Tests\Feature;

use App\Jobs\RunDeploymentJob;
use App\Models\Application;
use App\Models\Environment;
use App\Models\PipelineStep;
use App\Models\Plan;
use App\Models\Server;
use App\Models\Target;
use App\Models\TargetEnvironment;
use App\Models\User;
use App\Models\Workspace;
use App\Services\DeploymentAlreadyRunningException;
use App\Services\DeploymentNotResumableException;
use App\Services\DeploymentService;
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

    public function test_lock_is_released_once_a_deployment_finishes_allowing_a_new_one(): void
    {
        Queue::fake();

        $workspace = $this->makeWorkspace();
        $targetEnvironment = $this->makeTargetEnvironment($workspace, $this->makeServer($workspace));

        $first = app(DeploymentService::class)->trigger($targetEnvironment, 'manual');

        // Simule la libération du verrou par RunDeploymentJob (bloc finally)
        // une fois le déploiement terminé.
        $first->update(['status' => 'succes']);
        Cache::forget(DeploymentService::lockKey($targetEnvironment->id));

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
        Cache::forget(DeploymentService::lockKey($targetEnvironment->id));

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
        Cache::forget(DeploymentService::lockKey($targetEnvironment->id));
        $first->update(['status' => 'echec']);

        $second = app(DeploymentService::class)->trigger($targetEnvironment, 'manual');
        Cache::forget(DeploymentService::lockKey($targetEnvironment->id));
        $second->update(['status' => 'succes']);

        $this->expectException(DeploymentNotResumableException::class);

        app(DeploymentService::class)->resumeFromFailure($first->fresh());
    }
}
