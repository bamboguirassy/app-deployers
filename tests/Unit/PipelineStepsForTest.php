<?php

namespace Tests\Unit;

use App\Models\Application;
use App\Models\Environment;
use App\Models\PipelineStep;
use App\Models\Plan;
use App\Models\Target;
use App\Models\TargetEnvironment;
use App\Models\User;
use App\Models\Workspace;
use Database\Seeders\PlanSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use InvalidArgumentException;
use Tests\TestCase;

/**
 * Couvre uniquement la résolution `Target::pipelineStepsFor()` — le cœur du
 * mode `uniform_pipeline` (true = pipeline partagé, false = un pipeline par
 * TargetEnvironment). Volontairement testé en isolation avant de toucher aux
 * contrôleurs (PipelineStepController, DeploymentService).
 */
class PipelineStepsForTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(PlanSeeder::class);
    }

    private function makeTarget(bool $uniformPipeline = true): Target
    {
        $workspace = Workspace::create(['name' => 'Acme']);
        $workspace->subscription()->create(['plan_id' => Plan::free()->id, 'status' => 'active']);

        $application = Application::create([
            'workspace_id' => $workspace->id,
            'name' => 'API',
            'created_by' => User::factory()->create()->id,
        ]);

        return Target::create([
            'application_id' => $application->id,
            'name' => 'API',
            'slug' => 'api',
            'uniform_pipeline' => $uniformPipeline,
        ]);
    }

    private function makeTargetEnvironment(Target $target, string $name): TargetEnvironment
    {
        $environment = Environment::create([
            'application_id' => $target->application_id,
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

    public function test_uniform_target_resolves_the_shared_target_scoped_steps(): void
    {
        $target = $this->makeTarget(uniformPipeline: true);
        $targetEnvironment = $this->makeTargetEnvironment($target, 'Prod');

        $shared = PipelineStep::create([
            'target_id' => $target->id,
            'label' => 'Deploy',
            'type' => 'command',
            'config' => ['command' => 'echo hi'],
            'order' => 0,
        ]);

        $steps = $target->pipelineStepsFor($targetEnvironment)->get();

        $this->assertCount(1, $steps);
        $this->assertSame($shared->id, $steps->first()->id);
    }

    public function test_uniform_target_ignores_orphan_environment_scoped_steps(): void
    {
        $target = $this->makeTarget(uniformPipeline: true);
        $targetEnvironment = $this->makeTargetEnvironment($target, 'Prod');

        PipelineStep::create([
            'target_id' => $target->id,
            'target_environment_id' => $targetEnvironment->id,
            'label' => 'Orphelin',
            'type' => 'command',
            'config' => ['command' => 'echo orphan'],
            'order' => 0,
        ]);

        $steps = $target->pipelineStepsFor($targetEnvironment)->get();

        $this->assertCount(0, $steps);
    }

    public function test_non_uniform_target_resolves_steps_scoped_to_the_given_environment_only(): void
    {
        $target = $this->makeTarget(uniformPipeline: false);
        $prod = $this->makeTargetEnvironment($target, 'Prod');
        $staging = $this->makeTargetEnvironment($target, 'Staging');

        $prodStep = PipelineStep::create([
            'target_id' => $target->id,
            'target_environment_id' => $prod->id,
            'label' => 'Deploy prod',
            'type' => 'command',
            'config' => ['command' => 'echo prod'],
            'order' => 0,
        ]);

        PipelineStep::create([
            'target_id' => $target->id,
            'target_environment_id' => $staging->id,
            'label' => 'Deploy staging',
            'type' => 'command',
            'config' => ['command' => 'echo staging'],
            'order' => 0,
        ]);

        $steps = $target->pipelineStepsFor($prod)->get();

        $this->assertCount(1, $steps);
        $this->assertSame($prodStep->id, $steps->first()->id);
    }

    public function test_non_uniform_target_throws_without_an_environment(): void
    {
        $target = $this->makeTarget(uniformPipeline: false);

        $this->expectException(InvalidArgumentException::class);

        $target->pipelineStepsFor();
    }
}
