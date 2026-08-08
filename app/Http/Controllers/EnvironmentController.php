<?php

namespace App\Http\Controllers;

use App\Models\Application;
use App\Models\Workspace;
use App\Models\Environment;
use App\Support\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class EnvironmentController extends Controller
{
    public function store(Request $request, Workspace $workspace, Application $application): RedirectResponse
    {
        $this->authorize('manageEnvironments', $application);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $environment = $application->environments()->create([
            ...$data,
            'order' => $application->environments()->max('order') + 1,
        ]);

        AuditLogger::log($application, 'environment.created', $environment, $data);

        return back()->with('status', 'Environnement créé.');
    }

    public function update(Request $request, Workspace $workspace, Application $application, Environment $environment): RedirectResponse
    {
        $this->authorize('manageEnvironments', $application);
        abort_unless($environment->application_id === $application->id, 404);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $environment->update($data);

        AuditLogger::log($application, 'environment.updated', $environment, $data);

        return back()->with('status', 'Environnement mis à jour.');
    }

    public function destroy(Workspace $workspace, Application $application, Environment $environment): RedirectResponse
    {
        $this->authorize('manageEnvironments', $application);
        abort_unless($environment->application_id === $application->id, 404);

        $environment->delete();

        AuditLogger::log($application, 'environment.deleted', $environment);

        return back()->with('status', 'Environnement supprimé.');
    }
}
