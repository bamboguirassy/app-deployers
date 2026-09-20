<?php

namespace Tests\Feature;

use App\Jobs\RunDeploymentJob;
use App\Models\Application;
use App\Models\Deployment;
use App\Models\Environment;
use App\Models\PipelineStep;
use App\Models\Plan;
use App\Models\Target;
use App\Models\TargetEnvironment;
use App\Models\User;
use App\Models\Workspace;
use App\Services\DeploymentService;
use App\Services\QuotaGuard;
use App\Services\SshAuthenticator;
use App\StepActions\StepActionRegistry;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

/**
 * Reproduit le bug latent documenté dans CLAUDE.md : les events du job
 * (DeploymentStatusUpdated, ...) sont ShouldBroadcastNow, donc envoyés à
 * Reverb de façon synchrone. Ici on pointe la config broadcasting vers un
 * port fermé (personne n'écoute) pour provoquer un vrai échec de connexion —
 * pas un mock — et on vérifie que le nettoyage (verrou, slot, workspace
 * éphémère) a quand même lieu, et que le déploiement se termine avec le bon
 * statut plutôt que de rester bloqué en "running".
 */
class RunDeploymentJobBroadcastFailureTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(PlanSeeder::class);

        // Reverb (driver "reverb", protocole compatible Pusher) pointé vers un
        // port fermé en local : la première tentative de broadcast échoue
        // avec une vraie exception réseau, comme un Reverb réellement down.
        config([
            'broadcasting.default' => 'reverb',
            'broadcasting.connections.reverb.key' => 'test-key',
            'broadcasting.connections.reverb.secret' => 'test-secret',
            'broadcasting.connections.reverb.app_id' => 'test-app',
            'broadcasting.connections.reverb.options.host' => '127.0.0.1',
            'broadcasting.connections.reverb.options.port' => 1,
            'broadcasting.connections.reverb.options.scheme' => 'http',
            'broadcasting.connections.reverb.options.useTLS' => false,
        ]);
    }

    private function makeTargetEnvironment(): TargetEnvironment
    {
        $workspace = Workspace::create(['name' => 'Acme']);
        $workspace->subscription()->create(['plan_id' => Plan::free()->id, 'status' => 'active']);

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
            'config' => ['command' => 'exit 0'],
            'order' => 0,
        ]);

        // Pas de server_id : la commande s'exécute en local, on isole le test
        // du besoin d'un vrai serveur SSH.
        return TargetEnvironment::create([
            'target_id' => $target->id,
            'environment_id' => $environment->id,
            'deploy_path' => sys_get_temp_dir(),
            'git_branch' => 'main',
        ]);
    }

    /**
     * Reproduit DeploymentService::trigger() sans la vérification du serveur
     * (même bypass que DeploymentConcurrencyTest::triggerLocally()) — ce test
     * veut exercer le comportement du job face à un échec de broadcast, pas
     * le chemin SSH ; makeTargetEnvironment() ne configure volontairement pas
     * de server.
     */
    private function triggerLocally(TargetEnvironment $targetEnvironment): Deployment
    {
        Cache::add(
            DeploymentService::lockKey($targetEnvironment->id),
            true,
            now()->addMinutes(config('deploy.lock_ttl_minutes')),
        );

        $targetEnvironment->loadMissing('target.pipelineSteps', 'target.application.workspace');

        $deployment = Deployment::create([
            'target_environment_id' => $targetEnvironment->id,
            'status' => 'pending',
            'trigger_source' => 'manual',
            'branch' => $targetEnvironment->git_branch,
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

        return $deployment;
    }

    public function test_lock_and_slot_are_released_even_when_every_broadcast_fails(): void
    {
        // Preuve que la connexion Reverb factice échoue vraiment (et n'est
        // pas silencieusement no-op) : sans ça, ce test passerait même sans
        // le correctif, en ne vérifiant rien d'utile.
        Log::spy();

        $targetEnvironment = $this->makeTargetEnvironment();
        $deployment = $this->triggerLocally($targetEnvironment);

        $this->assertTrue(Cache::has(DeploymentService::lockKey($targetEnvironment->id)));

        app(RunDeploymentJob::class, ['deploymentId' => $deployment->id])->handle(
            app(SshAuthenticator::class),
            app(QuotaGuard::class),
            app(StepActionRegistry::class),
        );

        $this->assertSame('succes', $deployment->fresh()->status);
        $this->assertFalse(Cache::has(DeploymentService::lockKey($targetEnvironment->id)));
        $this->assertFalse(File::isDirectory(storage_path("app/deployments/{$deployment->id}/workspace")));

        Log::shouldHaveReceived('warning')
            ->withArgs(fn ($message) => str_contains($message, 'Deployment broadcast failed'))
            ->atLeast()->once();

        // Le verrou est bien libéré : un second déploiement peut être
        // déclenché sur le même environnement sans DeploymentAlreadyRunningException.
        $second = $this->triggerLocally($targetEnvironment->fresh());
        $this->assertSame('pending', $second->status);
    }

    public function test_a_deployment_still_finishes_as_echec_when_a_step_fails_and_broadcasting_is_down(): void
    {
        $targetEnvironment = $this->makeTargetEnvironment();
        $targetEnvironment->target->pipelineSteps()->update(['config' => ['command' => 'exit 1']]);

        $deployment = $this->triggerLocally($targetEnvironment->fresh());

        app(RunDeploymentJob::class, ['deploymentId' => $deployment->id])->handle(
            app(SshAuthenticator::class),
            app(QuotaGuard::class),
            app(StepActionRegistry::class),
        );

        $this->assertSame('echec', $deployment->fresh()->status);
        $this->assertFalse(Cache::has(DeploymentService::lockKey($targetEnvironment->id)));
    }
}
