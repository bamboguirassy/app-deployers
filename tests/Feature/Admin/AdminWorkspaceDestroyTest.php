<?php

namespace Tests\Feature\Admin;

use App\Models\Application;
use App\Models\AuditLog;
use App\Models\Deployment;
use App\Models\Environment;
use App\Models\PipelineStep;
use App\Models\Plan;
use App\Models\Server;
use App\Models\Target;
use App\Models\TargetEnvironment;
use App\Models\User;
use App\Models\Workspace;
use Database\Seeders\PlanSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class AdminWorkspaceDestroyTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
        $this->seed(PlanSeeder::class);
    }

    private function makeSuperAdmin(): User
    {
        return User::factory()->create(['is_super_admin' => true]);
    }

    /**
     * Construit un workspace avec un peu de tout — membre owner, serveur,
     * application/target/environment/pipeline, et un déploiement — pour
     * vérifier que la suppression purge réellement l'ensemble, y compris ce
     * qui n'est couvert par aucune contrainte de clé étrangère (les pivots
     * Spatie "team").
     */
    private function makeFullWorkspace(): array
    {
        $workspace = Workspace::create(['name' => 'Acme']);
        $workspace->subscription()->create(['plan_id' => Plan::free()->id, 'status' => 'active']);

        $owner = User::factory()->create();
        app(PermissionRegistrar::class)->setPermissionsTeamId($workspace->id);
        $owner->assignRole('owner');

        $server = Server::create([
            'workspace_id' => $workspace->id,
            'name' => 'prod-1',
            'host' => '10.0.0.1',
            'username' => 'deploy',
            'auth_method' => 'password',
            'password' => 'secret',
        ]);

        $application = Application::create([
            'workspace_id' => $workspace->id,
            'name' => 'API',
            'created_by' => $owner->id,
        ]);
        $target = Target::create(['application_id' => $application->id, 'name' => 'API', 'slug' => 'api']);
        $environment = Environment::create(['application_id' => $application->id, 'name' => 'Prod', 'slug' => 'prod']);
        PipelineStep::create([
            'target_id' => $target->id,
            'label' => 'Deploy',
            'type' => 'command',
            'config' => ['command' => 'echo hi'],
            'order' => 0,
        ]);
        $targetEnvironment = TargetEnvironment::create([
            'target_id' => $target->id,
            'environment_id' => $environment->id,
            'server_id' => $server->id,
            'deploy_path' => '/var/www/app',
            'git_branch' => 'main',
        ]);
        Deployment::create([
            'target_environment_id' => $targetEnvironment->id,
            'status' => 'succes',
            'trigger_source' => 'manual',
        ]);

        return compact('workspace', 'owner', 'server', 'application');
    }

    public function test_a_super_admin_can_permanently_delete_a_workspace_and_everything_in_it(): void
    {
        $admin = $this->makeSuperAdmin();
        ['workspace' => $workspace, 'owner' => $owner, 'server' => $server, 'application' => $application] =
            $this->makeFullWorkspace();

        $response = $this->actingAs($admin)->delete(route('admin.workspaces.destroy', $workspace->slug));

        $response->assertRedirect(route('admin.workspaces.index'));

        $this->assertDatabaseMissing('workspaces', ['id' => $workspace->id]);
        $this->assertDatabaseMissing('applications', ['id' => $application->id]);
        $this->assertDatabaseMissing('servers', ['id' => $server->id]);
        $this->assertDatabaseMissing('subscriptions', ['workspace_id' => $workspace->id]);

        // Pivots Spatie "team" — pas de FK, doivent être nettoyés à la main.
        $this->assertSame(
            0,
            DB::table('model_has_roles')->where('workspace_id', $workspace->id)->count(),
        );

        // L'utilisateur lui-même n'est pas supprimé, juste son rattachement à ce workspace.
        $this->assertDatabaseHas('users', ['id' => $owner->id]);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'workspace.delete',
            'subject_type' => Workspace::class,
            'subject_id' => $workspace->id,
            'context' => 'platform_admin',
        ]);
    }

    public function test_a_non_super_admin_cannot_delete_a_workspace(): void
    {
        $user = User::factory()->create();
        ['workspace' => $workspace] = $this->makeFullWorkspace();

        $response = $this->actingAs($user)->delete(route('admin.workspaces.destroy', $workspace->slug));

        $response->assertForbidden();
        $this->assertDatabaseHas('workspaces', ['id' => $workspace->id]);
    }
}
