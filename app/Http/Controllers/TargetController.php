<?php

namespace App\Http\Controllers;

use App\Models\Application;
use App\Models\PipelineStep;
use App\Models\TargetEnvironment;
use App\Models\Workspace;
use App\Models\Target;
use App\Support\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class TargetController extends Controller
{
    public function store(Request $request, Workspace $workspace, Application $application): RedirectResponse
    {
        $this->authorize('manageTargetsAndPipeline', $application);

        $data = $request->validate([
            'name'         => ['required', 'string', 'max:255'],
            'framework_id' => ['nullable', 'exists:frameworks,id'],
        ]);

        $target = $application->targets()->create([
            ...$data,
            'order' => $application->targets()->max('order') + 1,
        ]);

        AuditLogger::log($application, 'target.created', $target, $data);

        return back()->with('status', 'Target créé.');
    }

    public function update(Request $request, Workspace $workspace, Application $application, Target $target): RedirectResponse
    {
        $this->authorize('manageTargetsAndPipeline', $application);
        abort_unless($target->belongsToWorkspace($workspace), 404);

        $data = $request->validate([
            'name'                => ['sometimes', 'required', 'string', 'max:255'],
            'framework_id'        => ['sometimes', 'nullable', 'exists:frameworks,id'],
            'repository'          => ['sometimes', 'nullable', 'string', 'max:255'],
            'repository_provider' => ['sometimes', 'nullable', 'in:github,gitlab,bitbucket'],
        ]);

        $target->update($data);

        AuditLogger::log($application, 'target.updated', $target, $data);

        return back()->with('status', 'Target mis à jour.');
    }

    public function destroy(Workspace $workspace, Application $application, Target $target): RedirectResponse
    {
        $this->authorize('manageTargetsAndPipeline', $application);
        abort_unless($target->belongsToWorkspace($workspace), 404);

        $target->delete();

        AuditLogger::log($application, 'target.deleted', $target);

        return back()->with('status', 'Target supprimé.');
    }

    /**
     * Bascule true → false : chaque TargetEnvironment reçoit sa propre copie
     * du pipeline uniforme actuel comme point de départ, puis les steps
     * uniformes d'origine (target_environment_id null) sont supprimés — sans
     * ce nettoyage, ils resteraient en base et referaient surface de façon
     * incohérente si l'utilisateur réactive le mode uniforme plus tard (voir
     * enableUniformPipeline()).
     */
    public function disableUniformPipeline(Workspace $workspace, Application $application, Target $target): RedirectResponse
    {
        $this->authorize('manageTargetsAndPipeline', $application);
        abort_unless($target->belongsToWorkspace($workspace), 404);

        if (! $target->uniform_pipeline) {
            throw ValidationException::withMessages(['uniform_pipeline' => 'Ce target a déjà un pipeline par environnement.']);
        }

        DB::transaction(function () use ($target) {
            $uniformSteps = $target->pipelineSteps()->get();
            $environments = $target->targetEnvironments()->get();

            foreach ($environments as $environment) {
                foreach ($uniformSteps as $step) {
                    PipelineStep::create([
                        'target_id' => $target->id,
                        'target_environment_id' => $environment->id,
                        'label' => $step->label,
                        'type' => $step->type,
                        'config' => $step->config,
                        'order' => $step->order,
                        'timeout_seconds' => $step->timeout_seconds,
                        'continue_on_failure' => $step->continue_on_failure,
                    ]);
                }
            }

            $target->pipelineSteps()->delete();
            $target->update(['uniform_pipeline' => false]);
        });

        AuditLogger::log($application, 'target.pipeline_mode.disabled_uniform', $target);

        return back()->with('status', 'Chaque environnement a désormais son propre pipeline.');
    }

    /**
     * Bascule false → true : le pipeline de l'environnement de référence
     * choisi devient le nouveau pipeline uniforme (target_environment_id mis
     * à null), les pipelines des autres environnements sont définitivement
     * supprimés — l'utilisateur en est averti côté UI avant confirmation.
     */
    public function enableUniformPipeline(Request $request, Workspace $workspace, Application $application, Target $target): RedirectResponse
    {
        $this->authorize('manageTargetsAndPipeline', $application);
        abort_unless($target->belongsToWorkspace($workspace), 404);

        if ($target->uniform_pipeline) {
            throw ValidationException::withMessages(['uniform_pipeline' => 'Ce target a déjà un pipeline uniforme.']);
        }

        $data = $request->validate([
            'reference_target_environment_id' => [
                'required',
                Rule::exists('target_environments', 'uuid')->where('target_id', $target->id),
            ],
        ]);

        $reference = TargetEnvironment::where('uuid', $data['reference_target_environment_id'])->firstOrFail();

        DB::transaction(function () use ($target, $reference) {
            PipelineStep::where('target_id', $target->id)
                ->whereNotNull('target_environment_id')
                ->where('target_environment_id', '!=', $reference->id)
                ->delete();

            PipelineStep::where('target_id', $target->id)
                ->where('target_environment_id', $reference->id)
                ->update(['target_environment_id' => null]);

            $target->update(['uniform_pipeline' => true]);
        });

        AuditLogger::log($application, 'target.pipeline_mode.enabled_uniform', $target, [
            'reference_target_environment_id' => $reference->uuid,
        ]);

        return back()->with('status', 'Pipeline uniforme restauré à partir de l\'environnement choisi.');
    }
}
