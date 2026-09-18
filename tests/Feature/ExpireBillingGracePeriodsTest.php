<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\User;
use App\Models\Workspace;
use App\Notifications\SubscriptionRevertedToFreeNotification;
use Database\Seeders\PlanSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class ExpireBillingGracePeriodsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
        $this->seed(PlanSeeder::class);
    }

    public function test_it_reverts_expired_past_due_subscriptions_to_free_and_notifies_owners(): void
    {
        Notification::fake();

        $workspace = Workspace::create(['name' => 'Acme']);
        $workspace->subscription()->create([
            'plan_id' => Plan::query()->where('slug', 'pro')->firstOrFail()->id,
            'status' => 'past_due',
            'grace_period_ends_at' => now()->subDay(),
        ]);

        $owner = User::factory()->create();
        app(PermissionRegistrar::class)->setPermissionsTeamId($workspace->id);
        $owner->assignRole('owner');

        $this->artisan('billing:expire-grace-periods')->assertSuccessful();

        $workspace->refresh();
        $this->assertSame('canceled', $workspace->subscription->status);
        $this->assertNull($workspace->subscription->grace_period_ends_at);
        $this->assertSame('free', $workspace->effectivePlan()->slug);

        Notification::assertSentTo($owner, SubscriptionRevertedToFreeNotification::class);
    }

    public function test_it_leaves_past_due_subscriptions_within_grace_untouched(): void
    {
        Notification::fake();

        $workspace = Workspace::create(['name' => 'Acme']);
        $workspace->subscription()->create([
            'plan_id' => Plan::query()->where('slug', 'pro')->firstOrFail()->id,
            'status' => 'past_due',
            'grace_period_ends_at' => now()->addDay(),
        ]);

        $this->artisan('billing:expire-grace-periods')->assertSuccessful();

        $workspace->refresh();
        $this->assertSame('past_due', $workspace->subscription->status);

        Notification::assertNothingSent();
    }
}
