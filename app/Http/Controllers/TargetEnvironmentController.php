<?php

namespace App\Http\Controllers;

use App\Models\Application;
use App\Models\Environment;
use App\Models\Target;
use App\Models\TargetEnvironment;
use App\Models\Workspace;
use App\Support\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TargetEnvironmentController extends Controller
{
    public function store(Request $request, Workspace $workspace, Application $application, Target $target, Environment $environment): RedirectResponse
    {
        $this->authorize('manageEnvironments', $application);
        abort_unless(
            $target->belongsToWorkspace($workspace) && $environment->belongsToWorkspace($workspace),
            404
        );

        $data = $this->validated($request, $workspace);

        $targetEnvironment = TargetEnvironment::create([
            'target_id' => $target->id,
            'environment_id' => $environment->id,
            ...$data,
        ]);

        AuditLogger::log($application, 'target_environment.created', $targetEnvironment, $data);

        return back()->with('status', 'Configuration liée.');
    }

    public function update(Request $request, Workspace $workspace, Application $application, TargetEnvironment $targetEnvironment): RedirectResponse
    {
        $this->authorize('manageEnvironments', $application);
        abort_unless($targetEnvironment->belongsToWorkspace($workspace), 404);

        $data = $this->validated($request, $workspace);

        $targetEnvironment->update($data);

        AuditLogger::log($application, 'target_environment.updated', $targetEnvironment, $data);

        return back()->with('status', 'Configuration mise à jour.');
    }

    private function validated(Request $request, Workspace $workspace): array
    {
        return $request->validate([
            'server_id' => [
                'required',
                Rule::exists('servers', 'id')->where('workspace_id', $workspace->id),
            ],
            'deploy_path' => ['required', 'string', 'max:255'],
            'git_branch' => ['required', 'string', 'max:255'],
        ]);
    }
}
