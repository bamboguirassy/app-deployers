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
use App\Services\DeploymentAlreadyRunningException;
use App\Services\DeploymentService;
use App\Services\QuotaGuard;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

/**
 * Simule plusieurs déploiements concurrents (même workspace, workspaces
 * différents) sans worker Horizon réel : on appelle RunDeploymentJob::handle()
 * directement, ce qui exécute réellement les steps "command" en local (pas de
 * server configuré) tout en gardant le test synchrone et déterministe.
 */
class DeploymentConcurrencyTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(PlanSeeder::class);
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

    private function makeTargetEnvironment(Workspace $workspace, string $command = 'exit 0'): TargetEnvironment
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
            'config' => ['command' => $command],
            'order' => 0,
        ]);

        // Pas de server_id : CommandStepAction exécute la commande localement,
        // ce qui permet de tester le vrai chemin d'exécution sans SSH/serveur.
        return TargetEnvironment::create([
            'target_id' => $target->id,
            'environment_id' => $environment->id,
            'deploy_path' => sys_get_temp_dir(),
            'git_branch' => 'main',
        ]);
    }

    /**
     * Reproduit DeploymentService::trigger() sans la vérification du serveur
     * — ce test veut exercer le verrouillage/la file du job, pas le chemin
     * SSH ; makeTargetEnvironment() ne configure volontairement pas de server.
     */
    private function triggerLocally(TargetEnvironment $targetEnvironment): Deployment
    {
        $acquired = Cache::add(
            DeploymentService::lockKey($targetEnvironment->id),
            true,
            now()->addMinutes(config('deploy.lock_ttl_minutes')),
        );

        if (! $acquired) {
            throw new DeploymentAlreadyRunningException('Un déploiement est déjà en cours pour cet environnement.');
        }

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

    /**
     * Deux target/environnement distinctes, même workspace ou pas : le verrou
     * est scopé par target_environment_id donc les deux tournent en vrai
     * parallèle (aucune n'attend l'autre).
     */
    public function test_two_different_target_environments_run_concurrently_without_blocking_each_other(): void
    {
        $workspace = $this->makeWorkspace('pro'); // quota large pour isoler le test du verrou
        $teA = $this->makeTargetEnvironment($workspace);
        $teB = $this->makeTargetEnvironment($workspace);

        $deploymentA = $this->triggerLocally($teA);
        $deploymentB = $this->triggerLocally($teB);

        // Les deux verrous doivent être posés simultanément (pas d'exception).
        $this->assertTrue(Cache::has(DeploymentService::lockKey($teA->id)));
        $this->assertTrue(Cache::has(DeploymentService::lockKey($teB->id)));

        app(RunDeploymentJob::class, ['deploymentId' => $deploymentA->id])->handle(
            app(\App\Services\SshAuthenticator::class),
            app(QuotaGuard::class),
            app(\App\StepActions\StepActionRegistry::class),
        );
        app(RunDeploymentJob::class, ['deploymentId' => $deploymentB->id])->handle(
            app(\App\Services\SshAuthenticator::class),
            app(QuotaGuard::class),
            app(\App\StepActions\StepActionRegistry::class),
        );

        $this->assertSame('succes', $deploymentA->refresh()->status);
        $this->assertSame('succes', $deploymentB->refresh()->status);
        $this->assertFalse(Cache::has(DeploymentService::lockKey($teA->id)));
        $this->assertFalse(Cache::has(DeploymentService::lockKey($teB->id)));
    }

    /**
     * Même target/environnement : le second trigger doit être rejeté tant
     * que le premier déploiement n'a pas libéré son verrou.
     */
    public function test_same_target_environment_rejects_a_second_concurrent_trigger(): void
    {
        $workspace = $this->makeWorkspace('pro');
        $targetEnvironment = $this->makeTargetEnvironment($workspace);

        $this->triggerLocally($targetEnvironment);

        $this->expectException(DeploymentAlreadyRunningException::class);
        $this->triggerLocally($targetEnvironment);
    }

    /**
     * Plan free : max_concurrent_deployments = 1. Un deuxième déploiement du
     * même workspace (sur une AUTRE target/env, donc pas bloqué par le verrou)
     * ne doit pas s'exécuter avant que le premier ait libéré son slot — il
     * reste "pending" et le job se remet en file (release), sans planter.
     */
    public function test_workspace_plan_concurrency_limit_queues_the_extra_deployment_instead_of_running_it(): void
    {
        $workspace = $this->makeWorkspace('free');
        $teA = $this->makeTargetEnvironment($workspace, 'sleep 0.2');
        $teB = $this->makeTargetEnvironment($workspace);

        $deploymentA = $this->triggerLocally($teA);
        $deploymentB = $this->triggerLocally($teB);

        // Simule le slot de A déjà acquis (comme si son job tournait déjà),
        // sans exécuter A pour garder ce test focalisé sur le comportement du quota.
        app(QuotaGuard::class)->acquireDeploymentSlot($workspace);

        app(RunDeploymentJob::class, ['deploymentId' => $deploymentB->id])->handle(
            app(\App\Services\SshAuthenticator::class),
            app(QuotaGuard::class),
            app(\App\StepActions\StepActionRegistry::class),
        );

        // B n'a pas pu acquérir de slot : reste "pending", pas "running"/"echec".
        $this->assertSame('pending', $deploymentB->refresh()->status);
        // Le verrou de B (target/env) reste posé : il n'a pas été libéré puisque
        // B n'a jamais commencé à s'exécuter.
        $this->assertTrue(Cache::has(DeploymentService::lockKey($teB->id)));
    }

    /**
     * Deux workspaces différents ont chacun leur propre compteur de
     * concurrence (QuotaGuard::concurrencyKey scope par workspace_id) : le
     * quota de l'un n'affecte jamais l'autre.
     */
    public function test_concurrency_quota_is_isolated_per_workspace(): void
    {
        $workspaceA = $this->makeWorkspace('free'); // max 1
        $workspaceB = $this->makeWorkspace('free'); // max 1

        app(QuotaGuard::class)->acquireDeploymentSlot($workspaceA);

        // workspaceB doit pouvoir acquérir son propre slot sans être affecté
        // par le slot déjà pris par workspaceA.
        app(QuotaGuard::class)->acquireDeploymentSlot($workspaceB);

        $this->assertTrue(Cache::has(QuotaGuard::concurrencyKey($workspaceA->id)));
        $this->assertTrue(Cache::has(QuotaGuard::concurrencyKey($workspaceB->id)));
    }
}
