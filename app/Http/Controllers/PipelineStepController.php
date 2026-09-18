<?php

namespace App\Http\Controllers;

use App\Models\Application;
use App\Models\PipelineStep;
use App\Models\Target;
use App\Models\Workspace;
use App\StepActions\StepActionRegistry;
use App\Support\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PipelineStepController extends Controller
{
    public function __construct(private StepActionRegistry $stepActions) {}

    public function store(Request $request, Workspace $workspace, Application $application, Target $target): RedirectResponse
    {
        $this->authorize('manageTargetsAndPipeline', $application);
        abort_unless($target->belongsToWorkspace($workspace), 404);

        $data = $request->validate($this->rules($request));

        $step = $target->pipelineSteps()->create([
            ...$data,
            'order' => $target->pipelineSteps()->max('order') + 1,
        ]);

        AuditLogger::log($application, 'pipeline_step.created', $step, $data);

        return back()->with('status', 'Étape ajoutée.');
    }

    public function update(Request $request, Workspace $workspace, Application $application, Target $target, PipelineStep $pipelineStep): RedirectResponse
    {
        $this->authorize('manageTargetsAndPipeline', $application);
        abort_unless($target->belongsToWorkspace($workspace) && $pipelineStep->target_id === $target->id, 404);

        $data = $request->validate($this->rules($request));

        $pipelineStep->update($data);

        AuditLogger::log($application, 'pipeline_step.updated', $pipelineStep, $data);

        return back()->with('status', 'Étape mise à jour.');
    }

    /**
     * Règles communes à tous les types + règles spécifiques au type
     * sélectionné, déléguées au StepAction correspondant
     * (App\StepActions\StepActionContract::rules()).
     */
    private function rules(Request $request): array
    {
        $rules = [
            'label' => ['required', 'string', 'max:255'],
            'type' => ['required', 'string', Rule::in($this->stepActions->types())],
            'timeout_seconds' => ['nullable', 'integer', 'min:1', 'max:3600'],
            'continue_on_failure' => ['boolean'],
        ];

        $type = $request->input('type');

        if ($type && $this->stepActions->has($type)) {
            $action = $this->stepActions->get($type);

            foreach ($action::rules() as $key => $rule) {
                $rules["config.{$key}"] = $rule;
            }
        }

        return $rules;
    }

    public function destroy(Workspace $workspace, Application $application, Target $target, PipelineStep $pipelineStep): RedirectResponse
    {
        $this->authorize('manageTargetsAndPipeline', $application);
        abort_unless($target->belongsToWorkspace($workspace) && $pipelineStep->target_id === $target->id, 404);

        $pipelineStep->delete();

        AuditLogger::log($application, 'pipeline_step.deleted', $pipelineStep);

        return back()->with('status', 'Étape supprimée.');
    }

    public function reorder(Request $request, Workspace $workspace, Application $application, Target $target): RedirectResponse
    {
        $this->authorize('manageTargetsAndPipeline', $application);
        abort_unless($target->belongsToWorkspace($workspace), 404);

        $data = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['integer'],
        ]);

        foreach ($data['ids'] as $index => $id) {
            $target->pipelineSteps()->where('id', $id)->update(['order' => $index]);
        }

        return back()->with('status', 'Ordre mis à jour.');
    }
}
