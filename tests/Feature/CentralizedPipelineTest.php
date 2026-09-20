<?php

namespace Tests\Feature;

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
use App\Services\DeploymentService;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Symfony\Component\Process\Process;
use Tests\Support\LocalSshServer;
use Tests\TestCase;

/**
 * Le pipeline est une simple liste ordonnée de steps librement composée par
 * l'utilisateur — `clone` et `sync` sont des types de step ordinaires
 * (comme `command`/`email`), pas une bascule globale sur TargetEnvironment.
 * Ce test prouve le scénario hybride explicitement demandé : build
 * "centralisé" (clone + sync SFTP) *suivi* d'une commande post-déploiement
 * exécutée via SSH sur le vrai serveur du client (redémarrage de service,
 * etc.) — dans le MÊME pipeline, sans configuration globale contradictoire.
 * Aucun mock : vrai clone GitHub, vraie sync SFTP, vraie commande SSH
 * distante, contre un sshd local éphémère.
 */
class CentralizedPipelineTest extends TestCase
{
    use RefreshDatabase;

    private ?LocalSshServer $sshServer = null;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(PlanSeeder::class);
    }

    protected function tearDown(): void
    {
        $this->sshServer?->stop();

        parent::tearDown();
    }

    private function githubReachableOrSkip(): void
    {
        $process = new Process(['git', 'ls-remote', 'https://github.com/octocat/Hello-World.git', 'HEAD']);
        $process->setTimeout(8);

        try {
            $process->run();
        } catch (\Throwable) {
            $this->markTestSkipped('GitHub inaccessible depuis ce runner — test ignoré.');
        }

        if (! $process->isSuccessful()) {
            $this->markTestSkipped('GitHub inaccessible depuis ce runner — test ignoré.');
        }
    }

    public function test_a_pipeline_can_clone_sync_via_sftp_and_then_run_a_remote_command_on_the_same_server(): void
    {
        $this->githubReachableOrSkip();
        $this->sshServer = LocalSshServer::bootOrSkip();

        $workspace = Workspace::create(['name' => 'Acme']);
        $workspace->subscription()->create(['plan_id' => Plan::free()->id, 'status' => 'active']);

        $application = Application::create([
            'workspace_id' => $workspace->id,
            'name' => 'API',
            'created_by' => User::factory()->create()->id,
        ]);

        $target = Target::create([
            'application_id' => $application->id,
            'name' => 'API',
            'slug' => 'api',
            'repository' => 'octocat/Hello-World',
            'repository_provider' => 'github',
        ]);

        $environment = Environment::create(['application_id' => $application->id, 'name' => 'Prod', 'slug' => 'prod']);

        // Un seul serveur, avec de vrais identifiants SSH — il sert à la fois
        // de destination SFTP (step sync) et de cible d'exécution distante
        // (step command), exactement le scénario hybride demandé.
        $server = Server::create([
            'workspace_id' => $workspace->id,
            'name' => 'local-server',
            'host' => '127.0.0.1',
            'port' => $this->sshServer->port,
            'username' => $this->sshServer->username,
            'auth_method' => 'ssh_key',
            'private_key' => $this->sshServer->privateKey,
        ]);

        $remoteRoot = $this->sshServer->rootDir.'/site';
        mkdir($remoteRoot, 0777, true);

        $targetEnvironment = TargetEnvironment::create([
            'target_id' => $target->id,
            'environment_id' => $environment->id,
            'server_id' => $server->id,
            'deploy_path' => $remoteRoot,
            'git_branch' => 'master',
        ]);

        PipelineStep::create([
            'target_id' => $target->id,
            'label' => 'Cloner le dépôt',
            'type' => 'clone',
            'config' => [],
            'order' => 0,
        ]);

        PipelineStep::create([
            'target_id' => $target->id,
            'label' => 'Livrer par SFTP',
            'type' => 'sync',
            'config' => ['transport' => 'sftp', 'local_path' => ''],
            'order' => 1,
        ]);

        PipelineStep::create([
            'target_id' => $target->id,
            'label' => 'Commande post-déploiement',
            'type' => 'command',
            'config' => ['command' => 'echo restarted > POST_DEPLOY_MARKER.txt'],
            'order' => 2,
        ]);

        $targetEnvironment->loadMissing('target.pipelineSteps', 'target.application.workspace', 'target.variables', 'variables');

        $deployment = app(DeploymentService::class)->trigger($targetEnvironment, 'manual');

        $deployment->refresh();
        $this->assertSame('succes', $deployment->status, $this->stepsDebugOutput($deployment));

        $steps = $deployment->steps()->orderBy('order')->get();
        $this->assertCount(3, $steps);
        $this->assertSame(['clone', 'sync', 'command'], $steps->pluck('type')->all());
        $this->assertSame(['succes', 'succes', 'succes'], $steps->pluck('status')->all(), $this->stepsDebugOutput($deployment));

        // Le clone + sync ont bien livré le vrai contenu du dépôt cloné...
        $this->assertFileExists($remoteRoot.'/README');

        // ...et la commande post-déploiement a bien tourné sur le VRAI
        // serveur cible via SSH, pas sur le workspace local du runner.
        $this->assertFileExists($remoteRoot.'/POST_DEPLOY_MARKER.txt');
        $this->assertSame("restarted\n", file_get_contents($remoteRoot.'/POST_DEPLOY_MARKER.txt'));

        $targetEnvironment->refresh();
        $this->assertSame($deployment->commit_sha, $targetEnvironment->last_deployed_sha);
        $this->assertMatchesRegularExpression('/^[0-9a-f]{40}$/', $targetEnvironment->last_deployed_sha);

        $this->assertDirectoryDoesNotExist(storage_path("app/deployments/{$deployment->id}/workspace"));
    }

    private function stepsDebugOutput(Deployment $deployment): string
    {
        return $deployment->steps()->orderBy('order')->get()
            ->map(fn ($s) => "[{$s->type}:{$s->status}] {$s->output}")
            ->implode("\n---\n");
    }
}
