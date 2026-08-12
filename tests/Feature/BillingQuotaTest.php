<?php

namespace Tests\Feature;

use App\Models\Application;
use App\Models\Plan;
use App\Models\User;
use App\Models\Workspace;
use Database\Seeders\PlanSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class BillingQuotaTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
        $this->seed(PlanSeeder::class);
    }

    private function makeWorkspaceOnFreePlan(): Workspace
    {
        $workspace = Workspace::create(['name' => 'Acme']);

        $workspace->subscription()->create([
            'plan_id' => Plan::free()->id,
            'status' => 'active',
        ]);

        return $workspace;
    }

    public function test_application_creation_is_blocked_once_the_free_plan_quota_is_reached(): void
    {
        $workspace = $this->makeWorkspaceOnFreePlan();
        $owner = User::factory()->create();
        app(PermissionRegistrar::class)->setPermissionsTeamId($workspace->id);
        $owner->assignRole('owner');

        Application::create([
            'workspace_id' => $workspace->id,
            'name' => 'Première app',
            'created_by' => $owner->id,
        ]);

        $this->assertSame(1, Plan::free()->max_applications);

        $response = $this->actingAs($owner)
            ->from(route('applications.create', $workspace->slug))
            ->post(route('applications.store', $workspace->slug), ['name' => 'Deuxième app']);

        $response->assertRedirect(route('applications.create', $workspace->slug));
        $response->assertSessionHas('error');
        $this->assertDatabaseMissing('applications', ['workspace_id' => $workspace->id, 'name' => 'Deuxième app']);
    }

    public function test_a_workspace_without_any_subscription_row_falls_back_to_the_free_plan(): void
    {
        $workspace = Workspace::create(['name' => 'Legacy']);

        $this->assertSame('free', $workspace->effectivePlan()->slug);
    }

    public function test_a_past_due_subscription_within_its_grace_period_keeps_the_paid_plan(): void
    {
        $workspace = Workspace::create(['name' => 'Acme']);
        $workspace->subscription()->create([
            'plan_id' => Plan::query()->where('slug', 'pro')->firstOrFail()->id,
            'status' => 'past_due',
            'grace_period_ends_at' => now()->addDays(3),
        ]);

        $this->assertSame('pro', $workspace->effectivePlan()->slug);
    }

    public function test_a_past_due_subscription_past_its_grace_period_falls_back_to_free(): void
    {
        $workspace = Workspace::create(['name' => 'Acme']);
        $workspace->subscription()->create([
            'plan_id' => Plan::query()->where('slug', 'pro')->firstOrFail()->id,
            'status' => 'past_due',
            'grace_period_ends_at' => now()->subDay(),
        ]);

        $this->assertSame('free', $workspace->effectivePlan()->slug);
    }
}
