<?php

namespace Tests\Feature;

use App\Models\Application;
use App\Models\Environment;
use App\Models\Plan;
use App\Models\Server;
use App\Models\Target;
use App\Models\TargetEnvironment;
use App\Models\User;
use App\Models\Workspace;
use App\Transports\SshRsyncTransport;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\Support\LocalSshServer;
use Tests\TestCase;

class SshRsyncTransportIntegrationTest extends TestCase
{
    use RefreshDatabase;

    private ?LocalSshServer $sshServer = null;
    private string $localBuildDir;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(PlanSeeder::class);
        $this->localBuildDir = sys_get_temp_dir().'/rsync_build_'.bin2hex(random_bytes(6));
        mkdir($this->localBuildDir, 0777, true);
    }

    protected function tearDown(): void
    {
        $this->sshServer?->stop();
        $this->deleteDirectory($this->localBuildDir);

        parent::tearDown();
    }

    private function deleteDirectory(string $path): void
    {
        if (! is_dir($path)) {
            return;
        }

        foreach (scandir($path) as $entry) {
            if ($entry === '.' || $entry === '..') {
                continue;
            }

            $full = $path.'/'.$entry;
            is_dir($full) ? $this->deleteDirectory($full) : unlink($full);
        }

        rmdir($path);
    }

    private function makeTargetEnvironment(Server $server, string $deployPath): TargetEnvironment
    {
        $workspace = $server->workspace;
        $application = Application::create([
            'workspace_id' => $workspace->id,
            'name' => 'API',
            'created_by' => User::factory()->create()->id,
        ]);
        $target = Target::create(['application_id' => $application->id, 'name' => 'API', 'slug' => 'api']);
        $environment = Environment::create(['application_id' => $application->id, 'name' => 'Prod', 'slug' => 'prod']);

        return TargetEnvironment::create([
            'target_id' => $target->id,
            'environment_id' => $environment->id,
            'server_id' => $server->id,
            'deploy_path' => $deployPath,
            'build_mode' => 'centralized',
            'build_output_path' => 'dist',
        ]);
    }

    public function test_it_syncs_files_and_deletes_removed_ones_with_delete_flag(): void
    {
        $this->sshServer = LocalSshServer::bootOrSkip();

        if (trim((string) shell_exec('command -v rsync')) === '') {
            $this->markTestSkipped('rsync introuvable sur ce runner.');
        }

        $workspace = Workspace::create(['name' => 'Acme']);
        $workspace->subscription()->create(['plan_id' => Plan::free()->id, 'status' => 'active']);

        $server = Server::create([
            'workspace_id' => $workspace->id,
            'name' => 'local-rsync',
            'host' => '127.0.0.1',
            'port' => $this->sshServer->port,
            'username' => $this->sshServer->username,
            'auth_method' => 'ssh_key',
            'private_key' => $this->sshServer->privateKey,
            'connection_type' => 'ssh_rsync',
        ]);

        $remoteRoot = $this->sshServer->rootDir.'/app';
        mkdir($remoteRoot, 0777, true);
        $targetEnvironment = $this->makeTargetEnvironment($server, $remoteRoot)->fresh(['server']);

        file_put_contents($this->localBuildDir.'/index.html', '<html>v1</html>');
        mkdir($this->localBuildDir.'/nested');
        file_put_contents($this->localBuildDir.'/nested/app.js', 'console.log(1);');

        $transport = app(SshRsyncTransport::class);
        $result = $transport->sync($this->localBuildDir, $targetEnvironment, 'test:cancel:rsync:1');

        $this->assertTrue($result->success, $result->output);
        $this->assertFileExists($remoteRoot.'/index.html');
        $this->assertFileExists($remoteRoot.'/nested/app.js');

        // Deuxième sync : nested/app.js disparaît du build -> --delete doit
        // le retirer côté cible.
        unlink($this->localBuildDir.'/nested/app.js');
        rmdir($this->localBuildDir.'/nested');

        $result = $transport->sync($this->localBuildDir, $targetEnvironment, 'test:cancel:rsync:1');

        $this->assertTrue($result->success, $result->output);
        $this->assertFileExists($remoteRoot.'/index.html');
        $this->assertFileDoesNotExist($remoteRoot.'/nested/app.js');
    }

    public function test_it_rejects_a_passphrase_protected_key_with_a_clear_error(): void
    {
        $this->sshServer = LocalSshServer::bootOrSkip();

        $workspace = Workspace::create(['name' => 'Acme']);
        $workspace->subscription()->create(['plan_id' => Plan::free()->id, 'status' => 'active']);

        $server = Server::create([
            'workspace_id' => $workspace->id,
            'name' => 'local-rsync',
            'host' => '127.0.0.1',
            'port' => $this->sshServer->port,
            'username' => $this->sshServer->username,
            'auth_method' => 'ssh_key',
            'private_key' => $this->sshServer->privateKey,
            'passphrase' => 'secret',
            'connection_type' => 'ssh_rsync',
        ]);

        $targetEnvironment = $this->makeTargetEnvironment($server, $this->sshServer->rootDir)->fresh(['server']);

        $transport = app(SshRsyncTransport::class);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessageMatches('/passphrase/');

        $transport->sync($this->localBuildDir, $targetEnvironment, 'test:cancel:rsync:2');
    }
}
