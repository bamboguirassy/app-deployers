<?php

namespace Tests\Feature;

use App\Models\Application;
use App\Models\Environment;
use App\Models\PipelineStep;
use App\Models\Plan;
use App\Models\Server;
use App\Models\ServerCredential;
use App\Models\Target;
use App\Models\TargetEnvironment;
use App\Models\User;
use App\Models\Workspace;
use App\Services\DeploymentService;
use App\Services\MissingTransportCredentialsException;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * Couvre exhaustivement DeploymentService::assertTransportRequirementsAreMet()
 * — chaque combinaison (type de step × accès disponible) qui change le
 * verdict allow/reject. Complète les quelques cas déjà couverts dans
 * DeploymentServiceTest (clone/repository) sans les dupliquer.
 *
 * La matrice ne teste que la décision du garde-fou (throw ou non), pas
 * l'exécution réelle du transport — voir RunDeploymentJobExecutionMatrixTest
 * et CentralizedPipelineTest pour l'exécution de bout en bout.
 */
class TransportGuardMatrixTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(PlanSeeder::class);
    }

    private function makeTargetEnvironment(
        bool $withSsh,
        ?string $ftpCredential = null,
        ?string $sftpCredential = null,
    ): TargetEnvironment {
        $workspace = Workspace::create(['name' => 'Acme-'.uniqid()]);
        $workspace->subscription()->create(['plan_id' => Plan::free()->id, 'status' => 'active']);

        $application = Application::create([
            'workspace_id' => $workspace->id,
            'name' => 'API',
            'created_by' => User::factory()->create()->id,
        ]);
        $target = Target::create(['application_id' => $application->id, 'name' => 'API', 'slug' => 'api-'.uniqid()]);
        $environment = Environment::create(['application_id' => $application->id, 'name' => 'Prod', 'slug' => 'prod']);

        $server = Server::create([
            'workspace_id' => $workspace->id,
            'name' => 'srv-'.uniqid(),
            'host' => '10.0.0.1',
            ...($withSsh ? ['username' => 'deploy', 'auth_method' => 'password', 'password' => 'secret'] : []),
        ]);

        $ftpCredentialId = $ftpCredential
            ? ServerCredential::create(['server_id' => $server->id, 'type' => 'ftp', 'label' => $ftpCredential, 'username' => 'u', 'password' => 'p'])->id
            : null;
        $sftpCredentialId = $sftpCredential
            ? ServerCredential::create(['server_id' => $server->id, 'type' => 'sftp', 'label' => $sftpCredential, 'username' => 'u', 'password' => 'p'])->id
            : null;

        return TargetEnvironment::create([
            'target_id' => $target->id,
            'environment_id' => $environment->id,
            'server_id' => $server->id,
            'ftp_credential_id' => $ftpCredentialId,
            'sftp_credential_id' => $sftpCredentialId,
            'deploy_path' => '/var/www/app',
            'git_branch' => 'main',
        ]);
    }

    private function addStep(TargetEnvironment $targetEnvironment, string $type, array $config): void
    {
        PipelineStep::create([
            'target_id' => $targetEnvironment->target_id,
            'label' => $type,
            'type' => $type,
            'config' => $config,
            'order' => PipelineStep::where('target_id', $targetEnvironment->target_id)->max('order') + 1,
        ]);
    }

    /**
     * @return array<string, array{0: string, 1: array, 2: bool, 3: bool, 4: ?string, 5: ?string}>
     *         [type, config, withSsh, hasFtpCredential, hasSftpCredential, expectRejected]
     */
    public static function transportMatrix(): array
    {
        return [
            'command + ssh -> allowed' => ['command', ['command' => 'echo hi'], true, false, false, false],
            'command + no ssh -> rejected' => ['command', ['command' => 'echo hi'], false, false, false, true],

            'sync ssh_rsync + ssh -> allowed' => ['sync', ['transport' => 'ssh_rsync', 'local_path' => '', 'remote_path' => ''], true, false, false, false],
            'sync ssh_rsync + no ssh -> rejected' => ['sync', ['transport' => 'ssh_rsync', 'local_path' => '', 'remote_path' => ''], false, false, false, true],

            'sync sftp + ssh only -> allowed (repli)' => ['sync', ['transport' => 'sftp', 'local_path' => '', 'remote_path' => ''], true, false, false, false],
            'sync sftp + sftp credential only -> allowed' => ['sync', ['transport' => 'sftp', 'local_path' => '', 'remote_path' => ''], false, false, true, false],
            'sync sftp + ssh AND credential -> allowed' => ['sync', ['transport' => 'sftp', 'local_path' => '', 'remote_path' => ''], true, false, true, false],
            'sync sftp + neither -> rejected' => ['sync', ['transport' => 'sftp', 'local_path' => '', 'remote_path' => ''], false, false, false, true],

            'sync ftp + credential -> allowed' => ['sync', ['transport' => 'ftp', 'local_path' => '', 'remote_path' => ''], false, true, false, false],
            'sync ftp + ssh only (no credential) -> rejected' => ['sync', ['transport' => 'ftp', 'local_path' => '', 'remote_path' => ''], true, false, false, true],
            'sync ftp + nothing -> rejected' => ['sync', ['transport' => 'ftp', 'local_path' => '', 'remote_path' => ''], false, false, false, true],
        ];
    }

    #[DataProvider('transportMatrix')]
    public function test_transport_requirement_matrix(
        string $type,
        array $config,
        bool $withSsh,
        bool $hasFtpCredential,
        bool $hasSftpCredential,
        bool $expectRejected,
    ): void {
        Queue::fake();

        $targetEnvironment = $this->makeTargetEnvironment(
            $withSsh,
            $hasFtpCredential ? 'FTP account' : null,
            $hasSftpCredential ? 'SFTP account' : null,
        );
        $this->addStep($targetEnvironment, $type, $config);

        if ($expectRejected) {
            $this->expectException(MissingTransportCredentialsException::class);
        }

        $deployment = app(DeploymentService::class)->trigger($targetEnvironment->fresh(), 'manual');

        if (! $expectRejected) {
            $this->assertSame('pending', $deployment->status);
        }
    }

    /**
     * Un pipeline à plusieurs steps est rejeté dès que N'IMPORTE LEQUEL
     * d'entre eux manque d'accès — même si les autres sont valides. Preuve
     * que le garde-fou inspecte bien tout le pipeline, pas seulement le
     * premier step.
     */
    public function test_a_multi_step_pipeline_is_rejected_if_any_single_step_lacks_access(): void
    {
        $targetEnvironment = $this->makeTargetEnvironment(withSsh: true);
        $this->addStep($targetEnvironment, 'command', ['command' => 'echo ok']);
        $this->addStep($targetEnvironment, 'sync', ['transport' => 'ftp', 'local_path' => '', 'remote_path' => '']);

        $this->expectException(MissingTransportCredentialsException::class);

        app(DeploymentService::class)->trigger($targetEnvironment->fresh(), 'manual');
    }

    public function test_a_multi_step_pipeline_with_every_step_satisfied_is_accepted(): void
    {
        Queue::fake();

        $targetEnvironment = $this->makeTargetEnvironment(withSsh: true, ftpCredential: 'FTP account');
        $this->addStep($targetEnvironment, 'command', ['command' => 'echo ok']);
        $this->addStep($targetEnvironment, 'sync', ['transport' => 'ssh_rsync', 'local_path' => '', 'remote_path' => '']);
        $this->addStep($targetEnvironment, 'sync', ['transport' => 'ftp', 'local_path' => '', 'remote_path' => '']);

        $deployment = app(DeploymentService::class)->trigger($targetEnvironment->fresh(), 'manual');

        $this->assertSame('pending', $deployment->status);
        $this->assertSame(3, $deployment->steps()->count());
    }
}
