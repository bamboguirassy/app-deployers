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

class BillingRetryPaymentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
        $this->seed(PlanSeeder::class);
    }

    private function makeOwner(Workspace $workspace): User
    {
        $owner = User::factory()->create();
        app(PermissionRegistrar::class)->setPermissionsTeamId($workspace->id);
        $owner->assignRole('owner');

        return $owner;
    }

    public function test_retry_payment_is_rejected_when_subscription_is_not_past_due(): void
    {
        $workspace = Workspace::create(['name' => 'Acme']);
        $workspace->subscription()->create([
            'plan_id' => Plan::query()->where('slug', 'pro')->firstOrFail()->id,
            'status' => 'active',
            'paddle_subscription_id' => 'sub_123',
        ]);
        $owner = $this->makeOwner($workspace);

        $this->actingAs($owner)
            ->postJson(route('billing.retry-payment', $workspace->slug))
            ->assertStatus(422);
    }

    public function test_retry_payment_is_forbidden_for_a_non_owner(): void
    {
        $workspace = Workspace::create(['name' => 'Acme']);
        $workspace->subscription()->create([
            'plan_id' => Plan::query()->where('slug', 'pro')->firstOrFail()->id,
            'status' => 'past_due',
            'paddle_subscription_id' => 'sub_123',
        ]);

        $viewer = User::factory()->create();
        app(PermissionRegistrar::class)->setPermissionsTeamId($workspace->id);
        $viewer->assignRole('viewer');

        $this->actingAs($viewer)
            ->postJson(route('billing.retry-payment', $workspace->slug))
            ->assertForbidden();
    }

    public function test_retry_payment_returns_the_paddle_transaction_for_a_past_due_subscription(): void
    {
        $workspace = Workspace::create(['name' => 'Acme']);
        $workspace->subscription()->create([
            'plan_id' => Plan::query()->where('slug', 'pro')->firstOrFail()->id,
            'status' => 'past_due',
            'paddle_subscription_id' => 'sub_123',
        ]);
        $owner = $this->makeOwner($workspace);

        $mock = Mockery::mock(PaddleClient::class);
        $mock->shouldReceive('getUpdatePaymentMethodTransaction')
            ->once()
            ->with('sub_123')
            ->andReturn(['id' => 'txn_456']);
        $this->app->instance(PaddleClient::class, $mock);

        $this->actingAs($owner)
            ->postJson(route('billing.retry-payment', $workspace->slug))
            ->assertOk()
            ->assertJson(['transaction_id' => 'txn_456']);
    }
}
