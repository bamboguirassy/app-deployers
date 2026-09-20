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
use App\Transports\SftpTransport;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\LocalSshServer;
use Tests\TestCase;

class SftpTransportIntegrationTest extends TestCase
{
    use RefreshDatabase;

    private ?LocalSshServer $sshServer = null;
    private string $localBuildDir;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(PlanSeeder::class);
        $this->localBuildDir = sys_get_temp_dir().'/sftp_build_'.bin2hex(random_bytes(6));
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
        ]);
    }

    public function test_it_uploads_new_files_updates_changed_ones_and_deletes_removed_ones(): void
    {
        $this->sshServer = LocalSshServer::bootOrSkip();

        $workspace = Workspace::create(['name' => 'Acme']);
        $workspace->subscription()->create(['plan_id' => Plan::free()->id, 'status' => 'active']);

        $server = Server::create([
            'workspace_id' => $workspace->id,
            'name' => 'local-sftp',
            'host' => '127.0.0.1',
            'port' => $this->sshServer->port,
            'username' => $this->sshServer->username,
            'auth_method' => 'ssh_key',
            'private_key' => $this->sshServer->privateKey,
        ]);

        $remoteRoot = $this->sshServer->rootDir.'/app';
        mkdir($remoteRoot, 0777, true);
        $targetEnvironment = $this->makeTargetEnvironment($server, $remoteRoot)->fresh(['server']);

        // Premier build : index.html + nested/app.js.
        file_put_contents($this->localBuildDir.'/index.html', '<html>v1</html>');
        mkdir($this->localBuildDir.'/nested');
        file_put_contents($this->localBuildDir.'/nested/app.js', 'console.log(1);');

        $transport = app(SftpTransport::class);
        $result = $transport->sync($this->localBuildDir, $targetEnvironment, 'test:cancel:sftp:1');

        $this->assertTrue($result->success, $result->output);
        $this->assertFileExists($remoteRoot.'/index.html');
        $this->assertFileExists($remoteRoot.'/nested/app.js');
        $this->assertSame('<html>v1</html>', file_get_contents($remoteRoot.'/index.html'));

        // Deuxième build : index.html change, nested/app.js supprimé, style.css apparaît.
        file_put_contents($this->localBuildDir.'/index.html', '<html>v2</html>');
        unlink($this->localBuildDir.'/nested/app.js');
        rmdir($this->localBuildDir.'/nested');
        file_put_contents($this->localBuildDir.'/style.css', 'body{}');

        $result = $transport->sync($this->localBuildDir, $targetEnvironment, 'test:cancel:sftp:1');

        $this->assertTrue($result->success, $result->output);
        $this->assertSame('<html>v2</html>', file_get_contents($remoteRoot.'/index.html'));
        $this->assertFileExists($remoteRoot.'/style.css');
        $this->assertFileDoesNotExist($remoteRoot.'/nested/app.js');
    }

    public function test_it_stops_before_the_next_file_when_cancelled(): void
    {
        $this->sshServer = LocalSshServer::bootOrSkip();

        $workspace = Workspace::create(['name' => 'Acme']);
        $workspace->subscription()->create(['plan_id' => Plan::free()->id, 'status' => 'active']);

        $server = Server::create([
            'workspace_id' => $workspace->id,
            'name' => 'local-sftp',
            'host' => '127.0.0.1',
            'port' => $this->sshServer->port,
            'username' => $this->sshServer->username,
            'auth_method' => 'ssh_key',
            'private_key' => $this->sshServer->privateKey,
        ]);

        $remoteRoot = $this->sshServer->rootDir.'/app';
        mkdir($remoteRoot, 0777, true);
        $targetEnvironment = $this->makeTargetEnvironment($server, $remoteRoot)->fresh(['server']);

        file_put_contents($this->localBuildDir.'/a.txt', 'a');
        file_put_contents($this->localBuildDir.'/b.txt', 'b');

        $cancelKey = 'test:cancel:sftp:2';
        \Illuminate\Support\Facades\Cache::put($cancelKey, true);

        $transport = app(SftpTransport::class);
        $result = $transport->sync($this->localBuildDir, $targetEnvironment, $cancelKey);

        $this->assertTrue($result->cancelled);
        $this->assertSame('annule', $result->status());
    }
}
