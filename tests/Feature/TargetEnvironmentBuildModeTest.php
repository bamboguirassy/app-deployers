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
use Database\Seeders\PlanSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class TargetEnvironmentBuildModeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
        $this->seed(PlanSeeder::class);
    }

    private function makeSetup(string $connectionType): array
    {
        $workspace = Workspace::create(['name' => 'Acme']);
        $workspace->subscription()->create(['plan_id' => Plan::free()->id, 'status' => 'active']);

        $owner = User::factory()->create();
        app(PermissionRegistrar::class)->setPermissionsTeamId($workspace->id);
        $owner->assignRole('owner');

        $application = Application::create([
            'workspace_id' => $workspace->id,
            'name' => 'API',
            'created_by' => $owner->id,
        ]);
        $target = Target::create(['application_id' => $application->id, 'name' => 'API', 'slug' => 'api']);
        $environment = Environment::create(['application_id' => $application->id, 'name' => 'Prod', 'slug' => 'prod']);

        $server = Server::create([
            'workspace_id' => $workspace->id,
            'name' => 'srv-1',
            'host' => '10.0.0.1',
            'username' => 'deploy',
            'auth_method' => 'password',
            'password' => 'secret',
            'connection_type' => $connectionType,
        ]);

        return [$workspace, $owner, $application, $target, $environment, $server];
    }

    public function test_ssh_exec_server_defaults_to_on_target_build_without_regression(): void
    {
        [$workspace, $owner, $application, $target, $environment, $server] = $this->makeSetup('ssh_exec');

        $this->actingAs($owner)
            ->post(route('target-environments.store', [$workspace->slug, $application->slug, $target->uuid, $environment->uuid]), [
                'server_id' => $server->id,
                'deploy_path' => '/var/www/app',
                'git_branch' => 'main',
            ])
            ->assertRedirect();

        $targetEnvironment = TargetEnvironment::first();
        $this->assertSame('on_target', $targetEnvironment->build_mode);
    }

    public function test_sftp_server_rejects_on_target_build_mode(): void
    {
        [$workspace, $owner, $application, $target, $environment, $server] = $this->makeSetup('sftp');

        $this->actingAs($owner)
            ->post(route('target-environments.store', [$workspace->slug, $application->slug, $target->uuid, $environment->uuid]), [
                'server_id' => $server->id,
                'deploy_path' => '/var/www/app',
                'git_branch' => 'main',
                'build_mode' => 'on_target',
            ])
            ->assertSessionHasErrors('build_mode');

        $this->assertDatabaseCount('target_environments', 0);
    }

    public function test_sftp_server_requires_build_output_path_in_centralized_mode(): void
    {
        [$workspace, $owner, $application, $target, $environment, $server] = $this->makeSetup('sftp');

        $this->actingAs($owner)
            ->post(route('target-environments.store', [$workspace->slug, $application->slug, $target->uuid, $environment->uuid]), [
                'server_id' => $server->id,
                'deploy_path' => '/var/www/app',
                'git_branch' => 'main',
                'build_mode' => 'centralized',
            ])
            ->assertSessionHasErrors('build_output_path');
    }

    public function test_sftp_server_accepts_centralized_build_with_output_path(): void
    {
        [$workspace, $owner, $application, $target, $environment, $server] = $this->makeSetup('sftp');

        $this->actingAs($owner)
            ->post(route('target-environments.store', [$workspace->slug, $application->slug, $target->uuid, $environment->uuid]), [
                'server_id' => $server->id,
                'deploy_path' => '/var/www/app',
                'git_branch' => 'main',
                'build_mode' => 'centralized',
                'build_output_path' => 'dist',
            ])
            ->assertRedirect();

        $targetEnvironment = TargetEnvironment::first();
        $this->assertSame('centralized', $targetEnvironment->build_mode);
        $this->assertSame('dist', $targetEnvironment->build_output_path);
    }

    public function test_ssh_exec_server_rejects_centralized_build_mode(): void
    {
        [$workspace, $owner, $application, $target, $environment, $server] = $this->makeSetup('ssh_exec');

        $this->actingAs($owner)
            ->post(route('target-environments.store', [$workspace->slug, $application->slug, $target->uuid, $environment->uuid]), [
                'server_id' => $server->id,
                'deploy_path' => '/var/www/app',
                'git_branch' => 'main',
                'build_mode' => 'centralized',
                'build_output_path' => 'dist',
            ])
            ->assertSessionHasErrors('build_mode');
    }
}
