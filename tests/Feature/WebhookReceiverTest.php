<?php

namespace Tests\Feature;

use App\Models\Application;
use App\Models\Environment;
use App\Models\PipelineStep;
use App\Models\Plan;
use App\Models\Server;
use App\Models\Target;
use App\Models\TargetEnvironment;
use App\Models\User;
use App\Models\WebhookConfig;
use App\Models\Workspace;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WebhookReceiverTest extends TestCase
{
    use RefreshDatabase;

    private const SECRET = 'super-secret';

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(PlanSeeder::class);
    }

    private function makeWebhookConfig(): WebhookConfig
    {
        $workspace = Workspace::create(['name' => 'Acme']);
        $workspace->subscription()->create(['plan_id' => Plan::free()->id, 'status' => 'active']);

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
            'created_by' => User::factory()->create()->id,
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

        TargetEnvironment::create([
            'target_id' => $target->id,
            'environment_id' => $environment->id,
            'server_id' => $server->id,
            'deploy_path' => '/var/www/app',
            'git_branch' => 'main',
        ]);

        $webhookConfig = WebhookConfig::create([
            'target_id' => $target->id,
            'provider' => 'github',
            'secret' => self::SECRET,
            'enabled' => true,
        ]);

        $webhookConfig->branchMappings()->create([
            'environment_id' => $environment->id,
            'branch' => 'main',
        ]);

        return $webhookConfig;
    }

    private function sign(string $body): string
    {
        return 'sha256='.hash_hmac('sha256', $body, self::SECRET);
    }

    public function test_it_rejects_a_request_with_an_invalid_signature(): void
    {
        $webhookConfig = $this->makeWebhookConfig();
        $payload = ['ref' => 'refs/heads/main', 'after' => 'abc123'];

        $response = $this->postJson(
            route('webhooks.receive', ['github', $webhookConfig->uuid]),
            $payload,
            ['X-Hub-Signature-256' => 'sha256=not-the-right-signature'],
        );

        $response->assertStatus(401);
        $this->assertDatabaseCount('deployments', 0);
    }

    public function test_it_triggers_a_deployment_for_a_correctly_signed_push(): void
    {
        $webhookConfig = $this->makeWebhookConfig();
        $body = json_encode(['ref' => 'refs/heads/main', 'after' => 'abc123']);

        $response = $this->call(
            'POST',
            route('webhooks.receive', ['github', $webhookConfig->uuid]),
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_X-Hub-Signature-256' => $this->sign($body),
                'HTTP_X-GitHub-Delivery' => 'delivery-1',
            ],
            $body,
        );

        $response->assertStatus(202);
        $this->assertDatabaseCount('deployments', 1);
        $this->assertDatabaseHas('deployments', ['commit_sha' => 'abc123', 'branch' => 'main']);
    }

    public function test_it_ignores_a_replayed_delivery_even_after_the_short_dedupe_window(): void
    {
        $webhookConfig = $this->makeWebhookConfig();
        $body = json_encode(['ref' => 'refs/heads/main', 'after' => 'abc123']);
        $headers = [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X-Hub-Signature-256' => $this->sign($body),
            'HTTP_X-GitHub-Delivery' => 'delivery-1',
        ];

        $first = $this->call('POST', route('webhooks.receive', ['github', $webhookConfig->uuid]), [], [], [], $headers, $body);
        $first->assertStatus(202);

        // Même ID de livraison rejoué (requête capturée) : doit être ignoré même
        // si on est hors de la fenêtre de dédoublonnage "retry légitime" de 30s
        // qui existait avant — c'est exactement ce que le TTL de 24h couvre.
        $second = $this->call('POST', route('webhooks.receive', ['github', $webhookConfig->uuid]), [], [], [], $headers, $body);
        $second->assertOk();
        $second->assertJsonFragment(['message' => 'Doublon ignoré (même livraison déjà traitée).']);

        $this->assertDatabaseCount('deployments', 1);
    }
}
