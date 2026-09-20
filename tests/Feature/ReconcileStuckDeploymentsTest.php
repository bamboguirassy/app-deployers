<?php

namespace Tests\Feature;

use App\Models\Application;
use App\Models\Deployment;
use App\Models\DeploymentStep;
use App\Models\Environment;
use App\Models\Plan;
use App\Models\Server;
use App\Models\Target;
use App\Models\TargetEnvironment;
use App\Models\User;
use App\Models\Workspace;
use App\Services\QuotaGuard;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
        // L'environnement est libéré du seul fait que le déploiement a quitté
        // "running" — occupation et slot en sont tous deux dérivés.
        $this->assertFalse(
            Deployment::where('target_environment_id', $targetEnvironment->id)
                ->whereIn('status', ['pending', 'running'])
                ->exists()
        );
        // Le slot de concurrence est dérivé du statut : sortir de "running" le libère.
        $this->assertSame(0, app(QuotaGuard::class)->runningDeploymentCount($workspace));
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

    /**
     * Nouveau filet : un déploiement resté "pending" dont le job a disparu
     * (file Redis vidée, Horizon purgé) ne sera jamais résolu par
     * retryUntil()/failed(), puisqu'il n'y a plus de job. L'occupation d'un
     * environnement étant dérivée des déploiements non terminés, il bloquerait
     * cet environnement indéfiniment.
     */
    public function test_it_abandons_pending_deployments_whose_job_never_ran(): void
    {
        ['targetEnvironment' => $targetEnvironment, 'deployment' => $deployment] = $this->makeRunningDeployment();

        $threshold = (int) config('deploy.stuck_pending_after_minutes');
        $deployment->update(['status' => 'pending', 'started_at' => null]);
        $deployment->timestamps = false;
        $deployment->updated_at = now()->subMinutes($threshold + 5);
        $deployment->save();

        $this->artisan('deploy:reconcile-stuck')->assertSuccessful();

        $this->assertSame('echec', $deployment->refresh()->status);
        $this->assertFalse(
            Deployment::where('target_environment_id', $targetEnvironment->id)
                ->whereIn('status', ['pending', 'running'])
                ->exists()
        );
    }

    /**
     * À l'inverse, un déploiement qui attend encore légitimement un slot de
     * concurrence ne doit pas être abandonné : le seuil "pending" est
     * volontairement supérieur à queue_wait_timeout_minutes.
     */
    public function test_it_leaves_a_deployment_still_legitimately_waiting_for_a_slot(): void
    {
        ['deployment' => $deployment] = $this->makeRunningDeployment();

        $waitTimeout = (int) config('deploy.queue_wait_timeout_minutes');
        $this->assertGreaterThan($waitTimeout, (int) config('deploy.stuck_pending_after_minutes'));

        $deployment->update([
            'status' => 'pending',
            'queued_reason' => Deployment::QUEUED_FOR_CONCURRENCY,
            'started_at' => null,
        ]);
        $deployment->timestamps = false;
        $deployment->updated_at = now()->subMinutes($waitTimeout - 5);
        $deployment->save();

        $this->artisan('deploy:reconcile-stuck')->assertSuccessful();

        $this->assertSame('pending', $deployment->refresh()->status);
    }
}
