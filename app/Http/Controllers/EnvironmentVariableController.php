<?php

namespace App\Http\Controllers;

use App\Models\Application;
use App\Models\Workspace;
use App\Models\EnvironmentVariable;
use App\Models\TargetEnvironment;
use App\Support\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class EnvironmentVariableController extends Controller
{
    public function store(Request $request, Workspace $workspace, Application $application, TargetEnvironment $targetEnvironment): RedirectResponse
    {
        $this->authorize('manageEnvironments', $application);
        abort_unless($targetEnvironment->belongsToWorkspace($workspace), 404);

        $data = $request->validate([
            'key' => ['required', 'string', 'max:255', 'regex:/^[A-Z0-9_]+$/'],
            'value' => ['required', 'string'],
            'is_secret' => ['boolean'],
        ]);

        $variable = $targetEnvironment->variables()->create($data);

        AuditLogger::log($application, 'environment_variable.created', $variable, ['key' => $data['key']]);

        return back()->with('status', 'Variable ajoutée.');
    }

    public function update(Request $request, Workspace $workspace, Application $application, EnvironmentVariable $environmentVariable): RedirectResponse
    {
        $this->authorize('manageEnvironments', $application);
        abort_unless($environmentVariable->belongsToWorkspace($workspace), 404);

        $data = $request->validate([
            'key' => ['required', 'string', 'max:255', 'regex:/^[A-Z0-9_]+$/'],
            'value' => ['required', 'string'],
            'is_secret' => ['boolean'],
        ]);

        $environmentVariable->update($data);

        AuditLogger::log($application, 'environment_variable.updated', $environmentVariable, ['key' => $data['key']]);

        return back()->with('status', 'Variable mise à jour.');
    }

    public function destroy(Workspace $workspace, Application $application, EnvironmentVariable $environmentVariable): RedirectResponse
    {
        $this->authorize('manageEnvironments', $application);
        abort_unless($environmentVariable->belongsToWorkspace($workspace), 404);

        $environmentVariable->delete();

        AuditLogger::log($application, 'environment_variable.deleted', $environmentVariable);

        return back()->with('status', 'Variable supprimée.');
    }
}
