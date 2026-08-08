<?php

namespace App\Http\Controllers;

use App\Models\Application;
use App\Models\Workspace;
use App\Models\PipelineStep;
use App\Models\Target;
use App\Support\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class PipelineStepController extends Controller
{
    public function store(Request $request, Workspace $workspace, Application $application, Target $target): RedirectResponse
    {
        $this->authorize('manageTargetsAndPipeline', $application);
        abort_unless($target->application_id === $application->id, 404);

        $data = $request->validate([
            'label' => ['required', 'string', 'max:255'],
            'command' => ['required', 'string', 'max:2000'],
            'timeout_seconds' => ['nullable', 'integer', 'min:1', 'max:3600'],
            'continue_on_failure' => ['boolean'],
        ]);

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
        abort_unless($target->application_id === $application->id && $pipelineStep->target_id === $target->id, 404);

        $data = $request->validate([
            'label' => ['required', 'string', 'max:255'],
            'command' => ['required', 'string', 'max:2000'],
            'timeout_seconds' => ['nullable', 'integer', 'min:1', 'max:3600'],
            'continue_on_failure' => ['boolean'],
        ]);

        $pipelineStep->update($data);

        AuditLogger::log($application, 'pipeline_step.updated', $pipelineStep, $data);

        return back()->with('status', 'Étape mise à jour.');
    }

    public function destroy(Workspace $workspace, Application $application, Target $target, PipelineStep $pipelineStep): RedirectResponse
    {
        $this->authorize('manageTargetsAndPipeline', $application);
        abort_unless($target->application_id === $application->id && $pipelineStep->target_id === $target->id, 404);

        $pipelineStep->delete();

        AuditLogger::log($application, 'pipeline_step.deleted', $pipelineStep);

        return back()->with('status', 'Étape supprimée.');
    }

    public function reorder(Request $request, Workspace $workspace, Application $application, Target $target): RedirectResponse
    {
        $this->authorize('manageTargetsAndPipeline', $application);
        abort_unless($target->application_id === $application->id, 404);

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
