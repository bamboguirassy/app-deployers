<?php

namespace Tests\Unit;

use App\Models\Application;
use App\Models\Environment;
use App\Models\Plan;
use App\Models\Server;
use App\Models\ServerCredential;
use App\Models\Target;
use App\Models\TargetEnvironment;
use App\Models\User;
use App\Models\Workspace;
use App\Transports\FtpTransport;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Aucun serveur FTP local n'est disponible dans cet environnement de dev
 * (ni ftpd, ni conteneur) — impossible d'écrire ici le même test
 * d'intégration réel que pour ssh_rsync/sftp (voir *IntegrationTest.php).
 * Ce test couvre uniquement ce qui est vérifiable sans réseau : le
 * comportement d'échec propre (pas d'exception non catchée) quand la
 * connexion échoue, et l'enregistrement du type.
 */
class FtpTransportTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(PlanSeeder::class);
    }

    public function test_type_is_ftp(): void
    {
        $this->assertSame('ftp', FtpTransport::type());
    }

    public function test_sync_returns_a_failed_result_instead_of_throwing_when_connection_fails(): void
    {
        $workspace = Workspace::create(['name' => 'Acme']);
        $workspace->subscription()->create(['plan_id' => Plan::free()->id, 'status' => 'active']);

        $server = Server::create([
            'workspace_id' => $workspace->id,
            'name' => 'unreachable-ftp',
            // Port fermé délibérément : personne n'écoute ici, la connexion
            // doit échouer rapidement plutôt que de bloquer le test.
            'host' => '127.0.0.1',
            'port' => 1,
            'username' => 'nobody',
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

        $credential = ServerCredential::create([
            'server_id' => $server->id,
            'type' => 'ftp',
            'label' => 'Compte FTP test',
            'username' => 'nobody',
            'password' => 'secret',
        ]);

        $targetEnvironment = TargetEnvironment::create([
            'target_id' => $target->id,
            'environment_id' => $environment->id,
            'server_id' => $server->id,
            'ftp_credential_id' => $credential->id,
            'deploy_path' => '/var/www/app',
        ])->fresh(['server', 'ftpCredential']);

        $transport = new FtpTransport();
        $result = $transport->sync(sys_get_temp_dir(), $targetEnvironment, 'test:cancel:ftp:1');

        $this->assertFalse($result->success);
        $this->assertSame('echec', $result->status());
        $this->assertNotEmpty($result->output);
    }
}
