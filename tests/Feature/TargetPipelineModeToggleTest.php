<?php

namespace Tests\Feature;

use App\Models\Application;
use App\Models\Environment;
use App\Models\PipelineStep;
use App\Models\Target;
use App\Models\TargetEnvironment;
use App\Models\User;
use App\Models\Workspace;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class TargetPipelineModeToggleTest extends TestCase
{
    use RefreshDatabase;

    private Workspace $workspace;

    private Application $application;

    private User $owner;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);

        $this->workspace = Workspace::create(['name' => 'Acme']);
        $this->owner = User::factory()->create();
        app(PermissionRegistrar::class)->setPermissionsTeamId($this->workspace->id);
        $this->owner->syncRoles(['owner']);

        $this->application = Application::create([
            'workspace_id' => $this->workspace->id,
            'name' => 'API',
            'created_by' => $this->owner->id,
        ]);
    }

    private function makeEnvironment(string $name): Environment
    {
        return Environment::create([
            'application_id' => $this->application->id,
            'name' => $name,
            'slug' => strtolower($name),
        ]);
    }

    public function test_disable_uniform_pipeline_duplicates_steps_to_every_environment_and_clears_the_shared_ones(): void
    {
        $target = Target::create(['application_id' => $this->application->id, 'name' => 'API', 'slug' => 'api']);
        $prod = TargetEnvironment::create([
            'target_id' => $target->id, 'environment_id' => $this->makeEnvironment('Prod')->id,
            'deploy_path' => '/var/www/prod', 'git_branch' => 'main',
        ]);
        $staging = TargetEnvironment::create([
            'target_id' => $target->id, 'environment_id' => $this->makeEnvironment('Staging')->id,
            'deploy_path' => '/var/www/staging', 'git_branch' => 'develop',
        ]);

        PipelineStep::create([
            'target_id' => $target->id, 'label' => 'Deploy', 'type' => 'command',
            'config' => ['command' => 'echo hi'], 'order' => 0,
        ]);

        $this->actingAs($this->owner)->post(
            route('targets.pipeline-mode.disable-uniform', [$this->workspace->slug, $this->application->slug, $target->uuid]),
        )->assertSessionHasNoErrors();

        $target->refresh();
        $this->assertFalse($target->uniform_pipeline);
        $this->assertCount(0, $target->pipelineSteps()->get());
        $this->assertCount(1, $target->pipelineStepsFor($prod)->get());
        $this->assertCount(1, $target->pipelineStepsFor($staging)->get());
        $this->assertSame('Deploy', $target->pipelineStepsFor($prod)->first()->label);
    }

    public function test_enable_uniform_pipeline_promotes_the_reference_environment_and_deletes_the_others(): void
    {
        $target = Target::create([
            'application_id' => $this->application->id, 'name' => 'API', 'slug' => 'api', 'uniform_pipeline' => false,
        ]);
        $prod = TargetEnvironment::create([
            'target_id' => $target->id, 'environment_id' => $this->makeEnvironment('Prod')->id,
            'deploy_path' => '/var/www/prod', 'git_branch' => 'main',
        ]);
        $staging = TargetEnvironment::create([
            'target_id' => $target->id, 'environment_id' => $this->makeEnvironment('Staging')->id,
            'deploy_path' => '/var/www/staging', 'git_branch' => 'develop',
        ]);

        PipelineStep::create([
            'target_id' => $target->id, 'target_environment_id' => $prod->id,
            'label' => 'Deploy prod', 'type' => 'command', 'config' => ['command' => 'echo prod'], 'order' => 0,
        ]);
        PipelineStep::create([
            'target_id' => $target->id, 'target_environment_id' => $staging->id,
            'label' => 'Deploy staging', 'type' => 'command', 'config' => ['command' => 'echo staging'], 'order' => 0,
        ]);

        $this->actingAs($this->owner)->post(
            route('targets.pipeline-mode.enable-uniform', [$this->workspace->slug, $this->application->slug, $target->uuid]),
            ['reference_target_environment_id' => $prod->uuid],
        )->assertSessionHasNoErrors();

        $target->refresh();
        $this->assertTrue($target->uniform_pipeline);
        $steps = $target->pipelineSteps()->get();
        $this->assertCount(1, $steps);
        $this->assertSame('Deploy prod', $steps->first()->label);
        $this->assertSame(0, PipelineStep::whereNotNull('target_environment_id')->count());
    }

    public function test_enable_uniform_pipeline_rejects_a_reference_environment_from_another_target(): void
    {
        $target = Target::create([
            'application_id' => $this->application->id, 'name' => 'API', 'slug' => 'api', 'uniform_pipeline' => false,
        ]);
        $otherTarget = Target::create(['application_id' => $this->application->id, 'name' => 'Worker', 'slug' => 'worker']);
        $foreignEnvironment = TargetEnvironment::create([
            'target_id' => $otherTarget->id, 'environment_id' => $this->makeEnvironment('Prod')->id,
            'deploy_path' => '/var/www/prod', 'git_branch' => 'main',
        ]);

        $this->actingAs($this->owner)->post(
            route('targets.pipeline-mode.enable-uniform', [$this->workspace->slug, $this->application->slug, $target->uuid]),
            ['reference_target_environment_id' => $foreignEnvironment->uuid],
        )->assertSessionHasErrors('reference_target_environment_id');
    }
}
