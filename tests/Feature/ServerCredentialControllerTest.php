<?php

namespace Tests\Feature;

use App\Models\Server;
use App\Models\ServerCredential;
use App\Models\User;
use App\Models\Workspace;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class ServerCredentialControllerTest extends TestCase
{
    use RefreshDatabase;

    private Workspace $workspace;

    private User $owner;

    private Server $server;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);

        $this->workspace = Workspace::create(['name' => 'Acme']);
        $this->owner = User::factory()->create();
        app(PermissionRegistrar::class)->setPermissionsTeamId($this->workspace->id);
        $this->owner->syncRoles(['owner']);

        $this->server = Server::create(['workspace_id' => $this->workspace->id, 'name' => 'S1', 'host' => 'h']);
    }

    public function test_creates_an_ftp_credential_requiring_a_password(): void
    {
        $this->actingAs($this->owner)->post(
            route('server-credentials.store', [$this->workspace->slug, $this->server->uuid]),
            ['type' => 'ftp', 'label' => 'FTP client A', 'username' => 'clienta'],
        )->assertSessionHasErrors('password');

        $this->actingAs($this->owner)->post(
            route('server-credentials.store', [$this->workspace->slug, $this->server->uuid]),
            ['type' => 'ftp', 'label' => 'FTP client A', 'username' => 'clienta', 'password' => 'secret'],
        )->assertSessionHasNoErrors();

        $credential = ServerCredential::sole();
        $this->assertSame('ftp', $credential->type);
        $this->assertNull($credential->private_key);
    }

    public function test_creates_an_sftp_credential_with_either_password_or_key(): void
    {
        $this->actingAs($this->owner)->post(
            route('server-credentials.store', [$this->workspace->slug, $this->server->uuid]),
            ['type' => 'sftp', 'label' => 'SFTP B', 'username' => 'b'],
        )->assertSessionHasErrors('password');

        $this->actingAs($this->owner)->post(
            route('server-credentials.store', [$this->workspace->slug, $this->server->uuid]),
            ['type' => 'sftp', 'label' => 'SFTP B', 'username' => 'b', 'private_key' => '---KEY---'],
        )->assertSessionHasNoErrors();

        $this->assertSame(1, ServerCredential::where('type', 'sftp')->count());
    }

    public function test_destroy_is_rejected_when_the_credential_is_in_use(): void
    {
        $credential = ServerCredential::create([
            'server_id' => $this->server->id, 'type' => 'ftp', 'label' => 'FTP', 'username' => 'u', 'password' => 'p',
        ]);

        $application = \App\Models\Application::create([
            'workspace_id' => $this->workspace->id, 'name' => 'App', 'created_by' => $this->owner->id,
        ]);
        $target = \App\Models\Target::create(['application_id' => $application->id, 'name' => 'API', 'slug' => 'api']);
        $environment = \App\Models\Environment::create(['application_id' => $application->id, 'name' => 'Prod', 'slug' => 'prod']);
        \App\Models\TargetEnvironment::create([
            'target_id' => $target->id, 'environment_id' => $environment->id, 'server_id' => $this->server->id,
            'ftp_credential_id' => $credential->id, 'deploy_path' => '/var/www', 'git_branch' => 'main',
        ]);

        $this->actingAs($this->owner)->delete(
            route('server-credentials.destroy', [$this->workspace->slug, $this->server->uuid, $credential->uuid]),
        );

        $this->assertNotNull($credential->fresh());
    }
}
