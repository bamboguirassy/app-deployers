<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\User;
use App\Models\Workspace;
use App\Services\PaddleClient;
use Database\Seeders\PlanSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class BillingChangeIntervalTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
        $this->seed(PlanSeeder::class);

        Plan::query()->where('slug', 'pro')->update([
            'paddle_price_id_monthly' => 'pri_monthly',
            'paddle_price_id_yearly' => 'pri_yearly',
        ]);
    }

    private function makeOwner(Workspace $workspace): User
    {
        $owner = User::factory()->create();
        app(PermissionRegistrar::class)->setPermissionsTeamId($workspace->id);
        $owner->assignRole('owner');

        return $owner;
    }

    private function makeProWorkspace(string $interval, string $status = 'active'): Workspace
    {
        $workspace = Workspace::create(['name' => 'Acme']);
        $workspace->subscription()->create([
            'plan_id' => Plan::query()->where('slug', 'pro')->firstOrFail()->id,
            'status' => $status,
            'interval' => $interval,
            'paddle_subscription_id' => 'sub_123',
        ]);

        return $workspace;
    }

    public function test_it_switches_from_monthly_to_yearly_using_the_yearly_price(): void
    {
        $workspace = $this->makeProWorkspace('monthly');
        $owner = $this->makeOwner($workspace);

        $mock = Mockery::mock(PaddleClient::class);
        $mock->shouldReceive('changeSubscriptionPrice')->once()->with('sub_123', 'pri_yearly');
        $this->app->instance(PaddleClient::class, $mock);

        $this->actingAs($owner)
            ->postJson(route('billing.change-interval', $workspace->slug), ['interval' => 'yearly'])
            ->assertOk();
    }

    public function test_it_rejects_switching_to_the_same_interval(): void
    {
        $workspace = $this->makeProWorkspace('monthly');
        $owner = $this->makeOwner($workspace);

        $this->actingAs($owner)
            ->postJson(route('billing.change-interval', $workspace->slug), ['interval' => 'monthly'])
            ->assertStatus(422);
    }

    public function test_it_rejects_when_subscription_is_not_active(): void
    {
        $workspace = $this->makeProWorkspace('monthly', 'past_due');
        $owner = $this->makeOwner($workspace);

        $this->actingAs($owner)
            ->postJson(route('billing.change-interval', $workspace->slug), ['interval' => 'yearly'])
            ->assertStatus(422);
    }

    public function test_it_is_forbidden_for_a_non_owner(): void
    {
        $workspace = $this->makeProWorkspace('monthly');

        $viewer = User::factory()->create();
        app(PermissionRegistrar::class)->setPermissionsTeamId($workspace->id);
        $viewer->assignRole('viewer');

        $this->actingAs($viewer)
            ->postJson(route('billing.change-interval', $workspace->slug), ['interval' => 'yearly'])
            ->assertForbidden();
    }
}
