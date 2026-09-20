<?php

namespace Tests\Feature;

use App\Events\DeploymentStatusUpdated;
use App\Jobs\RunDeploymentJob;
use App\Listeners\NotifyOnDeploymentFailure;
use App\Models\Application;
use App\Models\Deployment;
use App\Models\Environment;
use App\Models\PipelineStep;
use App\Models\Plan;
use App\Models\Server;
use App\Models\Target;
use App\Models\TargetEnvironment;
use App\Models\User;
use App\Models\Workspace;
use App\Notifications\DeploymentFailedNotification;
use App\Notifications\DeploymentNeverStartedNotification;
use App\Services\QuotaGuard;
use App\Services\SshAuthenticator;
use App\StepActions\StepActionRegistry;
use Database\Seeders\PlanSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

/**
 * Un déploiement qui attend un slot de concurrence doit être *visible* comme
 * tel. Avant, il restait en "pending" exactement comme un déploiement qui
 * démarre normalement en moins d'une seconde : l'utilisateur voyait
 * « Déploiement lancé. » puis un déploiement figé, sans explication, jusqu'à
 * un éventuel abandon deux heures plus tard.
 */
class DeploymentQueueVisibilityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(PlanSeeder::class);
        $this->seed(RolesAndPermissionsSeeder::class);
    }

    private function makeWorkspace(string $planSlug = 'free'): Workspace
    {
        $workspace = Workspace::create(['name' => 'Acme-'.uniqid()]);
        $workspace->subscription()->create([
            'plan_id' => Plan::where('slug', $planSlug)->first()->id,
            'status' => 'active',
        ]);

        return $workspace;
    }

    private function makeTargetEnvironment(Workspace $workspace): TargetEnvironment
    {
        $application = Application::create([
            'workspace_id' => $workspace->id,
            'name' => 'API-'.uniqid(),
            'created_by' => User::factory()->create()->id,
        ]);
        $target = Target::create(['application_id' => $application->id, 'name' => 'API', 'slug' => 'api-'.uniqid()]);
        $environment = Environment::create(['application_id' => $application->id, 'name' => 'Prod', 'slug' => 'prod']);

        PipelineStep::create([
            'target_id' => $target->id,
            'label' => 'Deploy',
            'type' => 'command',
            'config' => ['command' => 'exit 0'],
            'order' => 0,
        ]);

        return TargetEnvironment::create([
            'target_id' => $target->id,
            'environment_id' => $environment->id,
            'deploy_path' => sys_get_temp_dir(),
            'git_branch' => 'main',
        ]);
    }

    /**
     * L'appartenance à un workspace est dérivée du pivot Spatie scopé par
     * workspace_id (voir Workspace::members()), pas d'une table dédiée.
     */
    private function makeOwner(Workspace $workspace): User
    {
        $owner = User::factory()->create();
        app(PermissionRegistrar::class)->setPermissionsTeamId($workspace->id);
        $owner->assignRole('owner');

        return $owner;
    }

    private function makeDeployment(TargetEnvironment $targetEnvironment, string $status = 'pending'): Deployment
    {
        return Deployment::create([
            'target_environment_id' => $targetEnvironment->id,
            'status' => $status,
            'trigger_source' => 'manual',
            'started_at' => $status === 'running' ? now() : null,
        ]);
    }

    private function runJob(Deployment $deployment): void
    {
        app(RunDeploymentJob::class, ['deploymentId' => $deployment->id])->handle(
            app(SshAuthenticator::class),
            app(QuotaGuard::class),
            app(StepActionRegistry::class),
        );
    }

    public function test_a_deployment_waiting_for_a_slot_is_flagged_as_queued(): void
    {
        Event::fake([DeploymentStatusUpdated::class]);

        $workspace = $this->makeWorkspace('free'); // 1 slot
        $running = $this->makeDeployment($this->makeTargetEnvironment($workspace), 'running');
        $waiting = $this->makeDeployment($this->makeTargetEnvironment($workspace));

        $this->runJob($waiting);

        $waiting->refresh();

        $this->assertSame('pending', $waiting->status);
        $this->assertSame(Deployment::QUEUED_FOR_CONCURRENCY, $waiting->queued_reason);
        $this->assertTrue($waiting->isQueuedForConcurrency());
        $this->assertSame('running', $running->refresh()->status);
    }

    /**
     * Le job se réveille toutes les `deploy.concurrency_retry_seconds` tant
     * qu'aucun slot ne se libère : diffuser à chaque passage inonderait le
     * WebSocket d'un message identique toutes les 10 secondes.
     */
    public function test_the_queued_state_is_broadcast_once_not_on_every_retry(): void
    {
        Event::fake([DeploymentStatusUpdated::class]);

        $workspace = $this->makeWorkspace('free');
        $this->makeDeployment($this->makeTargetEnvironment($workspace), 'running');
        $waiting = $this->makeDeployment($this->makeTargetEnvironment($workspace));

        $this->runJob($waiting);
        $this->runJob($waiting->refresh());
        $this->runJob($waiting->refresh());

        Event::assertDispatchedTimes(DeploymentStatusUpdated::class, 1);
    }

    public function test_starting_clears_the_queued_flag(): void
    {
        Event::fake([DeploymentStatusUpdated::class]);

        $workspace = $this->makeWorkspace('free');
        $targetEnvironment = $this->makeTargetEnvironment($workspace);
        $blocker = $this->makeDeployment($this->makeTargetEnvironment($workspace), 'running');
        $waiting = $this->makeDeployment($targetEnvironment);

        $this->runJob($waiting);
        $this->assertSame(Deployment::QUEUED_FOR_CONCURRENCY, $waiting->refresh()->queued_reason);

        // Le slot se libère.
        $blocker->update(['status' => 'succes', 'finished_at' => now()]);

        app(QuotaGuard::class)->claimDeploymentSlot($workspace, $waiting);

        $waiting->refresh();
        $this->assertSame('running', $waiting->status);
        $this->assertNull($waiting->queued_reason);
        $this->assertNull($waiting->queuePosition());
    }

    /**
     * Un rang calculé sur l'ensemble de la plateforme divulguerait l'activité
     * des autres clients — il doit rester scopé au workspace.
     */
    public function test_the_queue_position_is_scoped_to_the_workspace(): void
    {
        $mine = $this->makeWorkspace('free');
        $other = $this->makeWorkspace('free');

        // Deux déploiements en file chez un autre client, créés avant les miens.
        foreach ([1, 2] as $_) {
            $this->makeDeployment($this->makeTargetEnvironment($other))
                ->update(['queued_reason' => Deployment::QUEUED_FOR_CONCURRENCY]);
        }

        $first = $this->makeDeployment($this->makeTargetEnvironment($mine));
        $first->update(['queued_reason' => Deployment::QUEUED_FOR_CONCURRENCY]);

        $second = $this->makeDeployment($this->makeTargetEnvironment($mine));
        $second->update(['queued_reason' => Deployment::QUEUED_FOR_CONCURRENCY]);

        $this->assertSame(1, $first->refresh()->queuePosition());
        $this->assertSame(2, $second->refresh()->queuePosition());
    }

    public function test_a_deployment_that_never_started_gets_the_dedicated_notification(): void
    {
        Notification::fake();

        $workspace = $this->makeWorkspace('free');
        $targetEnvironment = $this->makeTargetEnvironment($workspace);
        $owner = $this->makeOwner($workspace);

        $deployment = $this->makeDeployment($targetEnvironment);
        $deployment->update([
            'status' => 'echec',
            'queued_reason' => Deployment::QUEUED_FOR_CONCURRENCY,
            'finished_at' => now(),
        ]);

        app(NotifyOnDeploymentFailure::class)->handle(new DeploymentStatusUpdated(
            $targetEnvironment->target->application_id,
            $workspace->id,
            $deployment->refresh(),
        ));

        Notification::assertSentTo($owner, DeploymentNeverStartedNotification::class);
        Notification::assertNotSentTo($owner, DeploymentFailedNotification::class);
    }

    public function test_a_deployment_that_actually_ran_keeps_the_standard_failure_notification(): void
    {
        Notification::fake();

        $workspace = $this->makeWorkspace('free');
        $targetEnvironment = $this->makeTargetEnvironment($workspace);
        $owner = $this->makeOwner($workspace);

        $deployment = $this->makeDeployment($targetEnvironment, 'running');
        $deployment->update(['status' => 'echec', 'finished_at' => now()]);

        app(NotifyOnDeploymentFailure::class)->handle(new DeploymentStatusUpdated(
            $targetEnvironment->target->application_id,
            $workspace->id,
            $deployment->refresh(),
        ));

        Notification::assertSentTo($owner, DeploymentFailedNotification::class);
        Notification::assertNotSentTo($owner, DeploymentNeverStartedNotification::class);
    }

    /**
     * Câblage bout-en-bout : la page de détail doit expliquer l'attente, avec
     * la limite du plan et un lien vers la facturation — c'est l'endroit
     * durable, contrairement au toast de confirmation qui a déjà disparu.
     */
    public function test_the_detail_page_explains_the_wait_to_a_workspace_owner(): void
    {
        $workspace = $this->makeWorkspace('free');
        $targetEnvironment = $this->makeTargetEnvironment($workspace);
        $owner = $this->makeOwner($workspace);

        $deployment = $this->makeDeployment($targetEnvironment);
        $deployment->update(['queued_reason' => Deployment::QUEUED_FOR_CONCURRENCY]);

        $application = $targetEnvironment->target->application;

        $this->actingAs($owner)
            ->get(route('deployments.show', [$workspace->slug, $application->slug, $deployment->uuid]))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('Deployments/Show')
                ->where('deployment.queued_reason', Deployment::QUEUED_FOR_CONCURRENCY)
                ->where('queue.position', 1)
                ->where('queue.limit', 1)
                ->where('queue.plan_name', 'Free')
                ->where('queue.billing_url', route('billing.show', $workspace->slug))
            );
    }

    /**
     * On n'envoie pas vers la facturation quelqu'un qui n'y a pas accès : le
     * front affiche alors « contactez le propriétaire du workspace ».
     */
    public function test_a_member_without_billing_access_gets_no_billing_link(): void
    {
        $workspace = $this->makeWorkspace('free');
        $targetEnvironment = $this->makeTargetEnvironment($workspace);
        $application = $targetEnvironment->target->application;

        $deployer = User::factory()->create();
        app(PermissionRegistrar::class)->setPermissionsTeamId($workspace->id);
        $deployer->assignRole('deployer');
        // Un non-owner a besoin d'un accès explicite à l'application
        // (pivot application_user) — voir User::hasAccessToApplication().
        $deployer->applications()->attach($application->id);

        $deployment = $this->makeDeployment($targetEnvironment);
        $deployment->update(['queued_reason' => Deployment::QUEUED_FOR_CONCURRENCY]);

        $this->actingAs($deployer)
            ->get(route('deployments.show', [$workspace->slug, $application->slug, $deployment->uuid]))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page->where('queue.billing_url', null));
    }

    /**
     * Le message de confirmation doit dire que le déploiement patiente plutôt
     * que d'annoncer « Déploiement lancé. » pour quelque chose qui ne
     * démarrera pas tout de suite.
     */
    public function test_triggering_while_saturated_tells_the_user_it_is_queued(): void
    {
        $workspace = $this->makeWorkspace('free'); // 1 slot
        $owner = $this->makeOwner($workspace);

        $server = Server::create([
            'workspace_id' => $workspace->id,
            'name' => 'prod-1',
            'host' => '10.0.0.1',
            'username' => 'deploy',
            'auth_method' => 'password',
            'password' => 'secret',
        ]);

        $busy = $this->makeTargetEnvironment($workspace);
        $busy->update(['server_id' => $server->id]);
        $this->makeDeployment($busy, 'running');

        $other = $this->makeTargetEnvironment($workspace);
        $other->update(['server_id' => $server->id]);
        $application = $other->target->application;

        $response = $this->actingAs($owner)->post(
            route('deployments.store', [$workspace->slug, $application->slug, $other->uuid])
        );

        $response->assertRedirect();
        $this->assertStringContainsString("file d'attente", session('status'));
    }
}
