<?php

namespace Tests\Feature;

use App\Models\Plan;
use App\Models\Workspace;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PaddleWebhookTest extends TestCase
{
    use RefreshDatabase;

    private const SECRET = 'test-webhook-secret';

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(PlanSeeder::class);
        config(['paddle.webhook_secret' => self::SECRET, 'paddle.signature_tolerance_seconds' => 300, 'paddle.grace_period_days' => 7]);
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

    private function postSignedWebhook(array $payload): \Illuminate\Testing\TestResponse
    {
        $body = json_encode($payload);
        $timestamp = time();
        $signature = hash_hmac('sha256', $timestamp.':'.$body, self::SECRET);

        return $this->call(
            'POST',
            route('webhooks.paddle'),
            server: ['HTTP_PADDLE_SIGNATURE' => "ts={$timestamp};h1={$signature}"],
            content: $body,
        );
    }

    public function test_subscription_updated_activates_the_pro_plan(): void
    {
        $workspace = $this->makeWorkspaceOnFreePlan();
        $proPlan = Plan::query()->where('slug', 'pro')->firstOrFail();
        $proPlan->update(['paddle_price_id_monthly' => 'pri_pro_test']);

        $this->postSignedWebhook([
            'event_type' => 'subscription.updated',
            'data' => [
                'id' => 'sub_123',
                'customer_id' => 'ctm_123',
                'items' => [['price' => ['id' => 'pri_pro_test']]],
                'custom_data' => ['workspace_id' => (string) $workspace->id],
                'billing_cycle' => ['interval' => 'year', 'frequency' => 1],
                'next_billed_at' => '2027-08-09T00:00:00Z',
            ],
        ])->assertOk();

        $workspace->refresh();
        $this->assertSame('active', $workspace->subscription->status);
        $this->assertSame('pro', $workspace->effectivePlan()->slug);
        $this->assertSame('yearly', $workspace->subscription->interval);
        $this->assertSame('2027-08-09', $workspace->subscription->renews_at->toDateString());
    }

    public function test_subscription_past_due_starts_a_grace_period(): void
    {
        $workspace = $this->makeWorkspaceOnFreePlan();
        $workspace->subscription->update(['paddle_subscription_id' => 'sub_456']);

        $this->postSignedWebhook([
            'event_type' => 'subscription.past_due',
            'data' => ['id' => 'sub_456'],
        ])->assertOk();

        $workspace->refresh();
        $this->assertSame('past_due', $workspace->subscription->status);
        $this->assertNotNull($workspace->subscription->grace_period_ends_at);
        $this->assertTrue($workspace->subscription->grace_period_ends_at->isFuture());
    }

    public function test_subscription_canceled_falls_back_to_free_without_grace(): void
    {
        $workspace = $this->makeWorkspaceOnFreePlan();
        $workspace->subscription->update(['paddle_subscription_id' => 'sub_789']);

        $this->postSignedWebhook([
            'event_type' => 'subscription.canceled',
            'data' => ['id' => 'sub_789'],
        ])->assertOk();

        $workspace->refresh();
        $this->assertSame('canceled', $workspace->subscription->status);
        $this->assertNull($workspace->subscription->grace_period_ends_at);
        $this->assertSame('free', $workspace->effectivePlan()->slug);
    }

    public function test_an_incorrectly_signed_webhook_is_rejected(): void
    {
        $response = $this->call(
            'POST',
            route('webhooks.paddle'),
            server: ['HTTP_PADDLE_SIGNATURE' => 'ts='.time().';h1=invalid'],
            content: json_encode(['event_type' => 'subscription.canceled', 'data' => ['id' => 'sub_000']]),
        );

        $response->assertStatus(401);
    }
}
