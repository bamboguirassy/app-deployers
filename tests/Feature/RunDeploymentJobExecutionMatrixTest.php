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
use App\Services\QuotaGuard;
use App\Services\SshAuthenticator;
use App\StepActions\StepActionRegistry;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

/**
 * Exécution réelle de RunDeploymentJob::handle() (pas de mock des steps) pour
 * les combinaisons de comportement de pipeline qui n'étaient testées nulle
 * part : échec + continue_on_failure, annulation, et parité d'exécution
 * entre pipeline uniforme et pipeline par environnement. Complète
 * TransportGuardMatrixTest (garde-fou au déclenchement) et
 * CentralizedPipelineTest (clone+sync+command réel via SSH/SFTP).
 *
 * Steps `command` exécutés en LOCAL (pas de server_id) — même bypass que
 * DeploymentConcurrencyTest::triggerLocally() : ce n'est pas le garde-fou
 * transport qui est visé ici (déjà couvert ailleurs) mais le comportement
 * du job face à l'enchaînement réel des steps.
 */
class RunDeploymentJobExecutionMatrixTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(PlanSeeder::class);
    }

    private function makeTarget(bool $uniformPipeline = true): Target
    {
        $workspace = Workspace::create(['name' => 'Acme-'.uniqid()]);
        $workspace->subscription()->create(['plan_id' => Plan::free()->id, 'status' => 'active']);

        $application = Application::create([
            'workspace_id' => $workspace->id,
            'name' => 'API',
            'created_by' => User::factory()->create()->id,
        ]);

        return Target::create([
            'application_id' => $application->id,
            'name' => 'API',
            'slug' => 'api-'.uniqid(),
            'uniform_pipeline' => $uniformPipeline,
        ]);
    }

    private function makeTargetEnvironment(Target $target, string $name = 'Prod'): TargetEnvironment
    {
        $environment = Environment::create(['application_id' => $target->application_id, 'name' => $name, 'slug' => strtolower($name).'-'.uniqid()]);

        return TargetEnvironment::create([
            'target_id' => $target->id,
            'environment_id' => $environment->id,
            'deploy_path' => sys_get_temp_dir(),
            'git_branch' => 'main',
        ]);
    }

    private function triggerLocally(TargetEnvironment $targetEnvironment): Deployment
    {

        $targetEnvironment->refresh()->loadMissing('target', 'target.application.workspace');

        $steps = $targetEnvironment->target->pipelineStepsFor($targetEnvironment)->get();

        $deployment = Deployment::create([
            'target_environment_id' => $targetEnvironment->id,
            'status' => 'pending',
            'trigger_source' => 'manual',
            'branch' => $targetEnvironment->git_branch,
        ]);

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
    }

    private function runJob(Deployment $deployment): void
    {
        app(RunDeploymentJob::class, ['deploymentId' => $deployment->id])->handle(
            app(SshAuthenticator::class),
            app(QuotaGuard::class),
            app(StepActionRegistry::class),
        );
    }

    private function addCommandStep(Target $target, string $command, ?TargetEnvironment $scope = null, bool $continueOnFailure = false): PipelineStep
    {
        return PipelineStep::create([
            'target_id' => $target->id,
            'target_environment_id' => $scope?->id,
            'label' => $command,
            'type' => 'command',
            'config' => ['command' => $command],
            'continue_on_failure' => $continueOnFailure,
            'order' => PipelineStep::where('target_id', $target->id)->max('order') + 1,
        ]);
    }

    public function test_all_steps_succeed(): void
    {
        $target = $this->makeTarget();
        $targetEnvironment = $this->makeTargetEnvironment($target);
        $this->addCommandStep($target, 'exit 0');
        $this->addCommandStep($target, 'exit 0');

        $deployment = $this->triggerLocally($targetEnvironment);
        $this->runJob($deployment);

        $this->assertSame('succes', $deployment->fresh()->status);
        $this->assertSame(['succes', 'succes'], $deployment->steps()->orderBy('order')->pluck('status')->all());
    }

    public function test_a_failure_without_continue_on_failure_skips_the_remaining_steps(): void
    {
        $target = $this->makeTarget();
        $targetEnvironment = $this->makeTargetEnvironment($target);
        $this->addCommandStep($target, 'exit 1', continueOnFailure: false);
        $this->addCommandStep($target, 'exit 0');

        $deployment = $this->triggerLocally($targetEnvironment);
        $this->runJob($deployment);

        $this->assertSame('echec', $deployment->fresh()->status);
        $this->assertSame(['echec', 'skipped'], $deployment->steps()->orderBy('order')->pluck('status')->all());
    }

    public function test_a_failure_with_continue_on_failure_still_runs_the_remaining_steps(): void
    {
        $target = $this->makeTarget();
        $targetEnvironment = $this->makeTargetEnvironment($target);
        $this->addCommandStep($target, 'exit 1', continueOnFailure: true);
        $this->addCommandStep($target, 'exit 0');

        $deployment = $this->triggerLocally($targetEnvironment);
        $this->runJob($deployment);

        // Le pipeline va au bout, mais un déploiement contenant un step en
        // échec ne peut jamais être rapporté comme un succès global.
        $this->assertSame('echec', $deployment->fresh()->status);
        $this->assertSame(['echec', 'succes'], $deployment->steps()->orderBy('order')->pluck('status')->all());
    }

    /**
     * Annulation pendant que le job est encore en file d'attente (avant
     * même l'acquisition d'un slot de concurrence) — c'est le seul des deux
     * chemins d'annulation (voir RunDeploymentJob::cancelWhileQueued() vs la
     * vérification du flag à l'intérieur de la boucle principale) qu'on peut
     * reproduire de façon déterministe en synchrone : le flag est déjà posé
     * avant même le premier appel à Cache::get(). Le déploiement passe direct
     * à "annule" sans jamais créer de statut sur ses steps (ils restent
     * "pending", intentionnellement — rien n'a démarré). L'annulation en
     * cours d'exécution (un step déjà "running" coupé par un changement de
     * flag pendant qu'il tourne) dépend d'un vrai timing concurrent
     * (worker + requête web séparée) : non reproductible ici sans mocker le
     * Cache, donc non couverte par ce test.
     */
    public function test_a_deployment_cancelled_while_still_queued_is_marked_annule_without_touching_its_steps(): void
    {
        $target = $this->makeTarget();
        $targetEnvironment = $this->makeTargetEnvironment($target);
        $this->addCommandStep($target, 'exit 0');
        $this->addCommandStep($target, 'exit 0');

        $deployment = $this->triggerLocally($targetEnvironment);
        Cache::put(RunDeploymentJob::cancelKey($deployment->id), true, now()->addMinute());

        $this->runJob($deployment);

        $this->assertSame('annule', $deployment->fresh()->status);
        $this->assertSame(['pending', 'pending'], $deployment->steps()->orderBy('order')->pluck('status')->all());
        // L'environnement est libéré : son déploiement a quitté les statuts
        // non terminaux (l'occupation en est dérivée).
        $this->assertFalse(
            Deployment::where('target_environment_id', $targetEnvironment->id)
                ->whereIn('status', ['pending', 'running'])
                ->exists()
        );
    }

    public function test_multiple_failures_with_continue_on_failure_are_all_recorded(): void
    {
        $target = $this->makeTarget();
        $targetEnvironment = $this->makeTargetEnvironment($target);
        $this->addCommandStep($target, 'exit 1', continueOnFailure: true);
        $this->addCommandStep($target, 'exit 1', continueOnFailure: true);
        $this->addCommandStep($target, 'exit 0');

        $deployment = $this->triggerLocally($targetEnvironment);
        $this->runJob($deployment);

        $this->assertSame('echec', $deployment->fresh()->status);
        $this->assertSame(['echec', 'echec', 'succes'], $deployment->steps()->orderBy('order')->pluck('status')->all());
    }

    /**
     * Le job n'a lui-même aucune notion de uniform_pipeline — il exécute la
     * liste de DeploymentStep déjà snapshotée. Ce test vérifie la parité
     * réelle bout en bout pour un target non-uniforme : chaque environnement
     * exécute bien SON pipeline propre, indépendamment de l'autre.
     */
    public function test_non_uniform_target_executes_each_environment_pipeline_independently(): void
    {
        $target = $this->makeTarget(uniformPipeline: false);
        $prod = $this->makeTargetEnvironment($target, 'Prod');
        $staging = $this->makeTargetEnvironment($target, 'Staging');

        $this->addCommandStep($target, 'echo prod > marker_prod.txt', scope: $prod);
        $this->addCommandStep($target, 'echo staging > marker_staging.txt', scope: $staging);

        $prodDeployment = $this->triggerLocally($prod);
        $this->runJob($prodDeployment);
        $stagingDeployment = $this->triggerLocally($staging);
        $this->runJob($stagingDeployment);

        $this->assertSame('succes', $prodDeployment->fresh()->status);
        $this->assertSame('succes', $stagingDeployment->fresh()->status);

        $this->assertCount(1, $prodDeployment->steps);
        $this->assertCount(1, $stagingDeployment->steps);
        $this->assertSame('echo prod > marker_prod.txt', $prodDeployment->steps()->first()->label_snapshot);
        $this->assertSame('echo staging > marker_staging.txt', $stagingDeployment->steps()->first()->label_snapshot);

        $this->assertFileExists(sys_get_temp_dir().'/marker_prod.txt');
        $this->assertFileExists(sys_get_temp_dir().'/marker_staging.txt');
        @unlink(sys_get_temp_dir().'/marker_prod.txt');
        @unlink(sys_get_temp_dir().'/marker_staging.txt');
    }

    /**
     * Complète FtpTransportTest (qui instancie FtpTransport directement) en
     * passant par le job complet : un compte FTP dédié est bien résolu et
     * utilisé par SyncStepAction/FtpTransport, et une connexion FTP
     * injoignable se traduit par un step "echec" propre — jamais une
     * exception non interceptée qui ferait planter le job.
     */
    public function test_a_sync_ftp_step_fails_cleanly_through_the_full_job_when_the_ftp_server_is_unreachable(): void
    {
        $target = $this->makeTarget();
        $targetEnvironment = $this->makeTargetEnvironment($target);

        $server = Server::create([
            'workspace_id' => $target->application->workspace_id,
            'name' => 'unreachable-ftp',
            'host' => '127.0.0.1',
            'port' => 1,
        ]);
        $credential = ServerCredential::create([
            'server_id' => $server->id, 'type' => 'ftp', 'label' => 'FTP', 'username' => 'u', 'password' => 'p',
        ]);
        $targetEnvironment->update(['server_id' => $server->id, 'ftp_credential_id' => $credential->id]);

        PipelineStep::create([
            'target_id' => $target->id,
            'label' => 'Sync FTP',
            'type' => 'sync',
            'config' => ['transport' => 'ftp', 'local_path' => '', 'remote_path' => ''],
            'order' => 0,
        ]);

        $deployment = $this->triggerLocally($targetEnvironment->fresh());
        $this->runJob($deployment);

        $this->assertSame('echec', $deployment->fresh()->status);
        $this->assertSame('echec', $deployment->steps()->first()->status);
        // L'environnement est libéré : son déploiement a quitté les statuts
        // non terminaux (l'occupation en est dérivée).
        $this->assertFalse(
            Deployment::where('target_environment_id', $targetEnvironment->id)
                ->whereIn('status', ['pending', 'running'])
                ->exists()
        );
    }
}
