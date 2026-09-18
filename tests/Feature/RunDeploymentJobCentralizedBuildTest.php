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
 * Bout-en-bout réel du build_mode=centralized : vrai `git clone` depuis
 * GitHub (dépôt public, sans credential), vraie étape de build exécutée
 * localement sur le contenu cloné, vraie synchronisation SFTP vers un sshd
 * local éphémère, vraie mise à jour de last_deployed_sha, vrai nettoyage du
 * workspace. Aucun mock — QUEUE_CONNECTION=sync en test fait exécuter
 * RunDeploymentJob de façon synchrone dès DeploymentService::trigger().
 */
class RunDeploymentJobCentralizedBuildTest extends TestCase
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
            $this->markTestSkipped('GitHub inaccessible depuis ce runner — test bout-en-bout ignoré.');
        }

        if (! $process->isSuccessful()) {
            $this->markTestSkipped('GitHub inaccessible depuis ce runner — test bout-en-bout ignoré.');
        }
    }

    public function test_it_clones_builds_and_syncs_a_real_public_repository_end_to_end(): void
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

        $server = Server::create([
            'workspace_id' => $workspace->id,
            'name' => 'local-sftp',
            'host' => '127.0.0.1',
            'port' => $this->sshServer->port,
            'username' => $this->sshServer->username,
            'auth_method' => 'ssh_key',
            'private_key' => $this->sshServer->privateKey,
            'connection_type' => 'sftp',
        ]);

        PipelineStep::create([
            'target_id' => $target->id,
            'label' => 'Build',
            'type' => 'command',
            'config' => ['command' => 'mkdir -p dist && cp README dist/readme.copy && echo synced > dist/marker.txt'],
            'order' => 0,
        ]);

        $remoteRoot = $this->sshServer->rootDir.'/site';
        mkdir($remoteRoot, 0777, true);

        $targetEnvironment = TargetEnvironment::create([
            'target_id' => $target->id,
            'environment_id' => $environment->id,
            'server_id' => $server->id,
            'deploy_path' => $remoteRoot,
            'git_branch' => 'master',
            'build_mode' => 'centralized',
            'build_output_path' => 'dist',
        ]);

        $targetEnvironment->loadMissing('target.pipelineSteps', 'target.application.workspace', 'target.variables', 'variables', 'server');

        $deployment = app(DeploymentService::class)->trigger($targetEnvironment, 'manual');

        $deployment->refresh();
        $this->assertSame('succes', $deployment->status, $this->stepsDebugOutput($deployment));

        $steps = $deployment->steps()->orderBy('order')->get();
        $this->assertCount(2, $steps);
        $this->assertSame('command', $steps[0]->type);
        $this->assertSame('succes', $steps[0]->status);
        $this->assertSame('sync', $steps[1]->type);
        $this->assertSame('succes', $steps[1]->status, $steps[1]->output);

        // Le build a bien cloné le vrai dépôt et exécuté la vraie commande
        // dessus, et seul dist/ (build_output_path) a été synchronisé.
        $this->assertFileExists($remoteRoot.'/marker.txt');
        $this->assertFileExists($remoteRoot.'/readme.copy');
        $this->assertFileDoesNotExist($remoteRoot.'/README');
        $this->assertSame("synced\n", file_get_contents($remoteRoot.'/marker.txt'));

        $targetEnvironment->refresh();
        $this->assertNotNull($targetEnvironment->last_deployed_sha);
        $this->assertSame($deployment->commit_sha, $targetEnvironment->last_deployed_sha);
        $this->assertMatchesRegularExpression('/^[0-9a-f]{40}$/', $targetEnvironment->last_deployed_sha);

        // Le workspace éphémère est nettoyé systématiquement après le déploiement.
        $this->assertDirectoryDoesNotExist(storage_path("app/deployments/{$deployment->id}/workspace"));
    }

    private function stepsDebugOutput(Deployment $deployment): string
    {
        return $deployment->steps()->orderBy('order')->get()
            ->map(fn ($s) => "[{$s->type}:{$s->status}] {$s->output}")
            ->implode("\n---\n");
    }
}
