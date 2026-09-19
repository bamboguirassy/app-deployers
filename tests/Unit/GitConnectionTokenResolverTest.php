<?php

namespace Tests\Unit;

use App\Models\Application;
use App\Models\GitConnection;
use App\Models\Plan;
use App\Models\Target;
use App\Models\User;
use App\Models\Workspace;
use App\Services\GitConnectionTokenResolver;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GitConnectionTokenResolverTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(PlanSeeder::class);
    }

    private function makeTarget(Workspace $workspace, string $provider): Target
    {
        $application = Application::create([
            'workspace_id' => $workspace->id,
            'name' => 'API',
            'created_by' => User::factory()->create()->id,
        ]);

        return Target::create([
            'application_id' => $application->id,
            'name' => 'API',
            'slug' => 'api',
            'repository' => 'owner/repo',
            'repository_provider' => $provider,
        ]);
    }

    public function test_it_returns_the_workspace_oauth_token_for_the_matching_provider(): void
    {
        $workspace = Workspace::create(['name' => 'Acme']);
        $workspace->subscription()->create(['plan_id' => Plan::free()->id, 'status' => 'active']);

        GitConnection::create([
            'workspace_id' => $workspace->id,
            'created_by' => User::factory()->create()->id,
            'provider' => 'github',
            'account_login' => 'octocat',
            'access_token' => 'gho_realtoken123',
        ]);

        $target = $this->makeTarget($workspace, 'github');

        $this->assertSame('gho_realtoken123', app(GitConnectionTokenResolver::class)->resolve($target));
    }

    public function test_it_returns_null_when_no_connection_exists_for_that_workspace(): void
    {
        $workspace = Workspace::create(['name' => 'Acme']);
        $workspace->subscription()->create(['plan_id' => Plan::free()->id, 'status' => 'active']);

        $target = $this->makeTarget($workspace, 'github');

        $this->assertNull(app(GitConnectionTokenResolver::class)->resolve($target));
    }

    public function test_it_does_not_leak_a_token_connected_on_a_different_workspace(): void
    {
        $otherWorkspace = Workspace::create(['name' => 'Other']);
        $otherWorkspace->subscription()->create(['plan_id' => Plan::free()->id, 'status' => 'active']);

        GitConnection::create([
            'workspace_id' => $otherWorkspace->id,
            'created_by' => User::factory()->create()->id,
            'provider' => 'github',
            'account_login' => 'someone-else',
            'access_token' => 'gho_othertoken',
        ]);

        $workspace = Workspace::create(['name' => 'Acme']);
        $workspace->subscription()->create(['plan_id' => Plan::free()->id, 'status' => 'active']);

        $target = $this->makeTarget($workspace, 'github');

        $this->assertNull(app(GitConnectionTokenResolver::class)->resolve($target));
    }

    public function test_it_does_not_return_a_token_connected_for_a_different_provider(): void
    {
        $workspace = Workspace::create(['name' => 'Acme']);
        $workspace->subscription()->create(['plan_id' => Plan::free()->id, 'status' => 'active']);

        GitConnection::create([
            'workspace_id' => $workspace->id,
            'created_by' => User::factory()->create()->id,
            'provider' => 'gitlab',
            'account_login' => 'octocat',
            'access_token' => 'glpat_sometoken',
        ]);

        $target = $this->makeTarget($workspace, 'github');

        $this->assertNull(app(GitConnectionTokenResolver::class)->resolve($target));
    }
}
