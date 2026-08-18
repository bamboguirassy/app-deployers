<?php

namespace App\Http\Controllers;

use App\Models\Application;
use App\Models\Workspace;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ApplicationNotificationSettingController extends Controller
{
    public function update(Request $request, Workspace $workspace, Application $application): JsonResponse
    {
        $this->authorize('manageTargetsAndPipeline', $application);
        abort_unless($application->belongsToWorkspace($workspace), 404);

        $data = $request->validate([
            'notify_on_start'   => ['required', 'boolean'],
            'notify_on_success' => ['required', 'boolean'],
            'notify_on_failure' => ['required', 'boolean'],
        ]);

        $settings = $application->getOrCreateNotificationSettings();
        $settings->update($data);

        AuditLogger::log($application, 'notification_settings.updated', $settings);

        return response()->json(['settings' => $settings->only('notify_on_start', 'notify_on_success', 'notify_on_failure')]);
    }
}
