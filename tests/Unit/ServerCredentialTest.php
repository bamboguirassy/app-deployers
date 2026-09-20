<?php

namespace Tests\Unit;

use App\Models\Server;
use App\Models\ServerCredential;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ServerCredentialTest extends TestCase
{
    use RefreshDatabase;

    public function test_password_is_encrypted_at_rest(): void
    {
        $workspace = Workspace::create(['name' => 'Acme']);
        $server = Server::create(['workspace_id' => $workspace->id, 'name' => 'S1', 'host' => 'h']);

        $credential = ServerCredential::create([
            'server_id' => $server->id,
            'type' => 'ftp',
            'label' => 'Compte client X',
            'username' => 'clientx',
            'password' => 'p@ss',
        ]);

        $raw = \DB::table('server_credentials')->where('id', $credential->id)->value('password');

        $this->assertNotSame('p@ss', $raw);
        $this->assertSame('p@ss', $credential->fresh()->password);
    }

    public function test_a_server_can_have_several_credentials_of_different_types(): void
    {
        $workspace = Workspace::create(['name' => 'Acme']);
        $server = Server::create(['workspace_id' => $workspace->id, 'name' => 'S1', 'host' => 'h']);

        ServerCredential::create(['server_id' => $server->id, 'type' => 'ftp', 'label' => 'FTP A', 'username' => 'a', 'password' => 'x']);
        ServerCredential::create(['server_id' => $server->id, 'type' => 'sftp', 'label' => 'SFTP B', 'username' => 'b', 'password' => 'y']);

        $this->assertCount(2, $server->credentials()->get());
        $this->assertSame($workspace->id, $server->credentials()->first()->resolveWorkspaceId());
    }

    public function test_credential_is_hidden_from_array_and_json_serialization(): void
    {
        $workspace = Workspace::create(['name' => 'Acme']);
        $server = Server::create(['workspace_id' => $workspace->id, 'name' => 'S1', 'host' => 'h']);
        $credential = ServerCredential::create([
            'server_id' => $server->id, 'type' => 'ftp', 'label' => 'FTP A', 'username' => 'a', 'password' => 'x',
        ]);

        $this->assertArrayNotHasKey('password', $credential->toArray());
    }
}
