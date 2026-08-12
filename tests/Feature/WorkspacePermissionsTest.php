<?php

namespace Tests\Feature;

use App\Models\Application;
use App\Models\User;
use App\Models\Workspace;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class WorkspacePermissionsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
    }

    private function makeWorkspace(): Workspace
    {
        return Workspace::create(['name' => 'Acme']);
    }

    private function assignRole(User $user, Workspace $workspace, string $role): void
    {
        app(PermissionRegistrar::class)->setPermissionsTeamId($workspace->id);
        $user->syncRoles([$role]);
    }

    private function makeApplication(Workspace $workspace, User $creator, string $name = 'API'): Application
    {
        return Application::create([
            'workspace_id' => $workspace->id,
            'name' => $name,
            'created_by' => $creator->id,
        ]);
    }

    public function test_workspace_owner_sees_every_application_without_explicit_access(): void
    {
        $workspace = $this->makeWorkspace();
        $owner = User::factory()->create();
        $this->assignRole($owner, $workspace, 'owner');

        $application = $this->makeApplication($workspace, $owner);
        // Le owner n'a volontairement PAS de ligne application_user.

        $this->assertTrue($owner->hasAccessToApplication($application));
        $this->assertTrue($workspace->visibleApplicationsFor($owner)->get()->contains($application));
    }

    public function test_non_owner_only_sees_applications_explicitly_granted(): void
    {
        $workspace = $this->makeWorkspace();
        $manager = User::factory()->create();
        $this->assignRole($manager, $workspace, 'manager');

        $visible = $this->makeApplication($workspace, $manager);
        $hidden = $this->makeApplication($workspace, $manager, 'Autre app');

        $visible->users()->attach($manager->id);

        $this->assertTrue($manager->hasAccessToApplication($visible));
        $this->assertFalse($manager->hasAccessToApplication($hidden));

        $visibleIds = $workspace->visibleApplicationsFor($manager)->pluck('id');
        $this->assertTrue($visibleIds->contains($visible->id));
        $this->assertFalse($visibleIds->contains($hidden->id));
    }

    public function test_only_owner_and_manager_can_create_applications(): void
    {
        $workspace = $this->makeWorkspace();

        $owner = User::factory()->create();
        $manager = User::factory()->create();
        $deployer = User::factory()->create();
        $viewer = User::factory()->create();

        $this->assignRole($owner, $workspace, 'owner');
        $this->assignRole($manager, $workspace, 'manager');
        $this->assignRole($deployer, $workspace, 'deployer');
        $this->assignRole($viewer, $workspace, 'viewer');

        $this->actingAs($owner)->get(route('applications.create', $workspace->slug))->assertOk();
        $this->actingAs($manager)->get(route('applications.create', $workspace->slug))->assertOk();
        $this->actingAs($deployer)->get(route('applications.create', $workspace->slug))->assertForbidden();
        $this->actingAs($viewer)->get(route('applications.create', $workspace->slug))->assertForbidden();
    }

    public function test_only_owner_and_manager_can_manage_servers(): void
    {
        $workspace = $this->makeWorkspace();

        $manager = User::factory()->create();
        $viewer = User::factory()->create();

        $this->assignRole($manager, $workspace, 'manager');
        $this->assignRole($viewer, $workspace, 'viewer');

        $payload = [
            'name' => 'Prod',
            'host' => '203.0.113.10',
            'username' => 'deploy',
            'auth_method' => 'password',
            'password' => 'secret',
        ];

        $this->actingAs($manager)->post(route('servers.store', $workspace->slug), $payload)->assertRedirect();
        $this->assertDatabaseHas('servers', ['workspace_id' => $workspace->id, 'name' => 'Prod']);

        $this->actingAs($viewer)->post(route('servers.store', $workspace->slug), [...$payload, 'name' => 'Autre'])
            ->assertForbidden();
        $this->assertDatabaseMissing('servers', ['workspace_id' => $workspace->id, 'name' => 'Autre']);
    }

    public function test_last_owner_of_a_workspace_cannot_be_demoted(): void
    {
        $workspace = $this->makeWorkspace();
        $owner = User::factory()->create();
        $this->assignRole($owner, $workspace, 'owner');

        $response = $this->actingAs($owner)
            ->patch(route('users.update', [$workspace->slug, $owner->uuid]), ['role' => 'viewer']);

        $response->assertStatus(422);
        $this->assertSame('owner', $owner->roleInWorkspace($workspace));
    }

    public function test_a_non_last_owner_can_be_removed_but_the_sole_remaining_owner_cannot_remove_themselves(): void
    {
        $workspace = $this->makeWorkspace();
        $owner1 = User::factory()->create();
        $owner2 = User::factory()->create();
        $this->assignRole($owner1, $workspace, 'owner');
        $this->assignRole($owner2, $workspace, 'owner');

        // Deux owners : en retirer un est sans risque, il en reste un.
        $this->actingAs($owner2)->delete(route('users.destroy', [$workspace->slug, $owner1->uuid]))->assertRedirect();
        $this->assertNull($owner1->fresh()->roleInWorkspace($workspace));

        // Owner2 est maintenant seul owner : il ne peut pas se retirer lui-même
        // (protection dédiée, indépendante du compteur d'owners).
        $this->actingAs($owner2)->delete(route('users.destroy', [$workspace->slug, $owner2->uuid]))->assertForbidden();
        $this->assertSame('owner', $owner2->fresh()->roleInWorkspace($workspace));
    }

    public function test_granting_application_access_requires_target_user_to_already_be_a_workspace_member(): void
    {
        $workspace = $this->makeWorkspace();
        $manager = User::factory()->create();
        $this->assignRole($manager, $workspace, 'manager');
        $application = $this->makeApplication($workspace, $manager);
        $application->users()->attach($manager->id);

        $stranger = User::factory()->create(['email' => 'stranger@example.com']);

        $response = $this->actingAs($manager)
            ->from(route('applications.show', [$workspace->slug, $application->slug]))
            ->post(route('members.store', [$workspace->slug, $application->slug]), ['email' => $stranger->email]);

        $response->assertSessionHasErrors('email');
        $this->assertFalse($stranger->fresh()->hasAccessToApplication($application));

        $this->assignRole($stranger, $workspace, 'viewer');

        $this->actingAs($manager)
            ->post(route('members.store', [$workspace->slug, $application->slug]), ['email' => $stranger->email])
            ->assertRedirect();

        $this->assertTrue($stranger->fresh()->hasAccessToApplication($application));
    }
}
