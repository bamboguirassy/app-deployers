<?php

namespace Tests\Feature;

use App\Models\Application;
use App\Models\Deployment;
use App\Models\DeploymentStep;
use App\Models\Environment;
use App\Models\Plan;
use App\Models\Server;
use App\Models\Target;
use App\Models\User;
use App\Models\TargetEnvironment;
use App\Models\Workspace;
use App\Services\DeploymentService;
use App\Services\QuotaGuard;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class ReconcileStuckDeploymentsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(PlanSeeder::class);
    }

    private function makeRunningDeployment(): array
    {
        $workspace = Workspace::create(['name' => 'Acme']);
        $workspace->subscription()->create(['plan_id' => Plan::free()->id, 'status' => 'active']);

        $server = Server::create([
            'workspace_id' => $workspace->id,
            'name' => 'prod-1',
            'host' => '10.0.0.1',
            'username' => 'deploy',
            'auth_method' => 'password',
            'password' => 'secret',
        ]);

        $application = Application::create([
            'workspace_id' => $workspace->id,
            'name' => 'API',
            'created_by' => User::factory()->create()->id,
        ]);
        $target = Target::create(['application_id' => $application->id, 'name' => 'API', 'slug' => 'api']);
        $environment = Environment::create(['application_id' => $application->id, 'name' => 'Prod', 'slug' => 'prod']);
        $targetEnvironment = TargetEnvironment::create([
            'target_id' => $target->id,
            'environment_id' => $environment->id,
            'server_id' => $server->id,
            'deploy_path' => '/var/www/app',
            'git_branch' => 'main',
        ]);

        $deployment = Deployment::create([
            'target_environment_id' => $targetEnvironment->id,
            'status' => 'running',
            'trigger_source' => 'manual',
            'started_at' => now()->subHours(3),
        ]);
        $deployment->timestamps = false;
        $deployment->updated_at = now()->subHours(3);
        $deployment->save();

        $step = DeploymentStep::create([
            'deployment_id' => $deployment->id,
            'label_snapshot' => 'Deploy',
            'type' => 'command',
            'config_snapshot' => ['command' => 'echo hi'],
            'order' => 0,
            'status' => 'running',
        ]);

        // Simule ce que RunDeploymentJob a posé avant que le worker ne soit tué.
        Cache::put(DeploymentService::lockKey($targetEnvironment->id), true, now()->addMinutes(20));
        app(QuotaGuard::class)->acquireDeploymentSlot($workspace);

        return compact('workspace', 'targetEnvironment', 'deployment', 'step');
    }

    public function test_it_marks_long_running_deployments_as_failed_and_releases_locks(): void
    {
        ['workspace' => $workspace, 'targetEnvironment' => $targetEnvironment, 'deployment' => $deployment, 'step' => $step] =
            $this->makeRunningDeployment();

        $this->artisan('deploy:reconcile-stuck')->assertSuccessful();

        $deployment->refresh();
        $step->refresh();

        $this->assertSame('echec', $deployment->status);
        $this->assertNotNull($deployment->finished_at);
        $this->assertSame('annule', $step->status);
        $this->assertNull(Cache::get(DeploymentService::lockKey($targetEnvironment->id)));
        $this->assertNull(Cache::get(QuotaGuard::concurrencyKey($workspace->id)));
    }

    public function test_it_leaves_recently_started_running_deployments_untouched(): void
    {
        $workspace = Workspace::create(['name' => 'Acme']);
        $workspace->subscription()->create(['plan_id' => Plan::free()->id, 'status' => 'active']);

        $server = Server::create([
            'workspace_id' => $workspace->id,
            'name' => 'prod-1',
            'host' => '10.0.0.1',
            'username' => 'deploy',
            'auth_method' => 'password',
            'password' => 'secret',
        ]);

        $application = Application::create([
            'workspace_id' => $workspace->id,
            'name' => 'API',
            'created_by' => User::factory()->create()->id,
        ]);
        $target = Target::create(['application_id' => $application->id, 'name' => 'API', 'slug' => 'api']);
        $environment = Environment::create(['application_id' => $application->id, 'name' => 'Prod', 'slug' => 'prod']);
        $targetEnvironment = TargetEnvironment::create([
            'target_id' => $target->id,
            'environment_id' => $environment->id,
            'server_id' => $server->id,
            'deploy_path' => '/var/www/app',
            'git_branch' => 'main',
        ]);

        $deployment = Deployment::create([
            'target_environment_id' => $targetEnvironment->id,
            'status' => 'running',
            'trigger_source' => 'manual',
            'started_at' => now(),
        ]);

        $this->artisan('deploy:reconcile-stuck')->assertSuccessful();

        $this->assertSame('running', $deployment->refresh()->status);
    }
}
