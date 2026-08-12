<?php

namespace App\Http\Controllers;

use App\Models\Application;
use App\Models\Workspace;
use App\Models\Target;
use App\Support\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class TargetController extends Controller
{
    public function store(Request $request, Workspace $workspace, Application $application): RedirectResponse
    {
        $this->authorize('manageTargetsAndPipeline', $application);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
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
            'name' => ['required', 'string', 'max:255'],
            'framework_id' => ['nullable', 'exists:frameworks,id'],
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
}
