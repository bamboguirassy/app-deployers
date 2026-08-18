<?php

namespace App\Http\Controllers;

use App\Models\Application;
use App\Models\Target;
use App\Models\TargetVariable;
use App\Models\Workspace;
use App\Support\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class TargetVariableController extends Controller
{
    public function store(Request $request, Workspace $workspace, Application $application, Target $target): RedirectResponse
    {
        $this->authorize('manageTargetsAndPipeline', $application);
        abort_unless($target->belongsToWorkspace($workspace), 404);

        $data = $request->validate([
            'key'           => ['required', 'string', 'max:255', 'regex:/^[A-Z0-9_]+$/'],
            'default_value' => ['nullable', 'string'],
            'is_secret'     => ['boolean'],
        ]);

        $variable = $target->variables()->create([
            ...$data,
            'order' => $target->variables()->max('order') + 1,
        ]);

        AuditLogger::log($application, 'target_variable.created', $variable, ['key' => $data['key']]);

        return back()->with('status', 'Variable ajoutée.');
    }

    public function update(Request $request, Workspace $workspace, Application $application, TargetVariable $targetVariable): RedirectResponse
    {
        $this->authorize('manageTargetsAndPipeline', $application);
        abort_unless($targetVariable->belongsToWorkspace($workspace), 404);

        $data = $request->validate([
            'key'           => ['required', 'string', 'max:255', 'regex:/^[A-Z0-9_]+$/'],
            'default_value' => ['nullable', 'string'],
            'is_secret'     => ['boolean'],
        ]);

        $targetVariable->update($data);

        AuditLogger::log($application, 'target_variable.updated', $targetVariable, ['key' => $data['key']]);

        return back()->with('status', 'Variable mise à jour.');
    }

    public function destroy(Workspace $workspace, Application $application, TargetVariable $targetVariable): RedirectResponse
    {
        $this->authorize('manageTargetsAndPipeline', $application);
        abort_unless($targetVariable->belongsToWorkspace($workspace), 404);

        $key = $targetVariable->key;
        $targetVariable->delete();

        AuditLogger::log($application, 'target_variable.deleted', null, ['key' => $key]);

        return back()->with('status', 'Variable supprimée.');
    }

    public function reorder(Request $request, Workspace $workspace, Application $application, Target $target): RedirectResponse
    {
        $this->authorize('manageTargetsAndPipeline', $application);
        abort_unless($target->belongsToWorkspace($workspace), 404);

        $data = $request->validate([
            'ids'   => ['required', 'array'],
            'ids.*' => ['integer'],
        ]);

        foreach ($data['ids'] as $index => $id) {
            $target->variables()->where('id', $id)->update(['order' => $index]);
        }

        return back()->with('status', 'Ordre mis à jour.');
    }
}
