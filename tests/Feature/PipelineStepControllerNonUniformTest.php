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

/**
 * Couvre le branchement HTTP de PipelineStepController sur le mode
 * `uniform_pipeline = false` — la résolution elle-même est déjà testée
 * en isolation dans tests/Unit/PipelineStepsForTest.php.
 */
class PipelineStepControllerNonUniformTest extends TestCase
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

    private function makeNonUniformTarget(): Target
    {
        return Target::create([
            'application_id' => $this->application->id,
            'name' => 'API',
            'slug' => 'api',
            'uniform_pipeline' => false,
        ]);
    }

    private function makeTargetEnvironment(Target $target, string $name): TargetEnvironment
    {
        $environment = Environment::create([
            'application_id' => $this->application->id,
            'name' => $name,
            'slug' => strtolower($name),
        ]);

        return TargetEnvironment::create([
            'target_id' => $target->id,
            'environment_id' => $environment->id,
            'deploy_path' => '/var/www/'.strtolower($name),
            'git_branch' => strtolower($name),
        ]);
    }

    public function test_store_requires_a_target_environment_when_pipeline_is_not_uniform(): void
    {
        $target = $this->makeNonUniformTarget();

        $response = $this->actingAs($this->owner)->post(
            route('pipeline-steps.store', [$this->workspace->slug, $this->application->slug, $target->uuid]),
            ['label' => 'Deploy', 'type' => 'command', 'config' => ['command' => 'echo hi']],
        );

        $response->assertSessionHasErrors('target_environment_id');
        $this->assertSame(0, PipelineStep::count());
    }

    public function test_store_scopes_the_created_step_to_the_given_environment(): void
    {
        $target = $this->makeNonUniformTarget();
        $prod = $this->makeTargetEnvironment($target, 'Prod');
        $staging = $this->makeTargetEnvironment($target, 'Staging');

        $this->actingAs($this->owner)->post(
            route('pipeline-steps.store', [$this->workspace->slug, $this->application->slug, $target->uuid]),
            [
                'label' => 'Deploy prod',
                'type' => 'command',
                'config' => ['command' => 'echo prod'],
                'target_environment_id' => $prod->uuid,
            ],
        )->assertSessionHasNoErrors();

        $step = PipelineStep::sole();
        $this->assertSame($prod->id, $step->target_environment_id);
        $this->assertCount(1, $target->pipelineStepsFor($prod)->get());
        $this->assertCount(0, $target->pipelineStepsFor($staging)->get());
    }

    public function test_reorder_only_affects_the_given_environments_steps(): void
    {
        $target = $this->makeNonUniformTarget();
        $prod = $this->makeTargetEnvironment($target, 'Prod');
        $staging = $this->makeTargetEnvironment($target, 'Staging');

        $a = PipelineStep::create([
            'target_id' => $target->id, 'target_environment_id' => $prod->id,
            'label' => 'A', 'type' => 'command', 'config' => ['command' => 'a'], 'order' => 0,
        ]);
        $b = PipelineStep::create([
            'target_id' => $target->id, 'target_environment_id' => $prod->id,
            'label' => 'B', 'type' => 'command', 'config' => ['command' => 'b'], 'order' => 1,
        ]);
        $stagingStep = PipelineStep::create([
            'target_id' => $target->id, 'target_environment_id' => $staging->id,
            'label' => 'C', 'type' => 'command', 'config' => ['command' => 'c'], 'order' => 0,
        ]);

        $this->actingAs($this->owner)->post(
            route('pipeline-steps.reorder', [$this->workspace->slug, $this->application->slug, $target->uuid]),
            ['ids' => [$b->id, $a->id], 'target_environment_id' => $prod->uuid],
        )->assertSessionHasNoErrors();

        $this->assertSame(0, $b->fresh()->order);
        $this->assertSame(1, $a->fresh()->order);
        $this->assertSame(0, $stagingStep->fresh()->order);
    }
}
