<?php

namespace Tests\Feature;

use App\Models\Server;
use App\Models\User;
use App\Models\Workspace;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class ServerSshOptionalTest extends TestCase
{
    use RefreshDatabase;

    private Workspace $workspace;

    private User $owner;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);

        $this->workspace = Workspace::create(['name' => 'Acme']);
        $this->owner = User::factory()->create();
        app(PermissionRegistrar::class)->setPermissionsTeamId($this->workspace->id);
        $this->owner->syncRoles(['owner']);
    }

    public function test_a_server_can_be_created_without_any_ssh_access(): void
    {
        $this->actingAs($this->owner)->post(
            route('servers.store', $this->workspace->slug),
            ['name' => 'FTP only', 'host' => 'ftp.example.com'],
        )->assertSessionHasNoErrors();

        $server = Server::sole();
        $this->assertNull($server->auth_method);
        $this->assertNull($server->username);
        $this->assertFalse($server->hasSsh());
    }

    public function test_username_without_auth_method_is_rejected(): void
    {
        $this->actingAs($this->owner)->post(
            route('servers.store', $this->workspace->slug),
            ['name' => 'Bad', 'host' => 'h.example.com', 'username' => 'deploy'],
        )->assertSessionHasErrors('auth_method');

        $this->assertSame(0, Server::count());
    }

    public function test_a_server_with_ssh_still_requires_a_password_or_key(): void
    {
        $this->actingAs($this->owner)->post(
            route('servers.store', $this->workspace->slug),
            ['name' => 'Bad2', 'host' => 'h.example.com', 'username' => 'deploy', 'auth_method' => 'password'],
        )->assertSessionHasErrors('password');
    }

    public function test_removing_ssh_from_an_existing_server_clears_its_credentials(): void
    {
        $server = Server::create([
            'workspace_id' => $this->workspace->id,
            'name' => 'Has SSH',
            'host' => 'h.example.com',
            'username' => 'deploy',
            'auth_method' => 'password',
            'password' => 'secret',
        ]);

        $this->actingAs($this->owner)->patch(
            route('servers.update', [$this->workspace->slug, $server->uuid]),
            ['name' => 'Has SSH', 'host' => 'h.example.com'],
        )->assertSessionHasNoErrors();

        $server->refresh();
        $this->assertNull($server->auth_method);
        $this->assertNull($server->username);
        $this->assertNull($server->password);
    }
}
