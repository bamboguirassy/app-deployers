<?php

use App\Models\Application;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('application.{applicationId}', function (User $user, int $applicationId) {
    $application = Application::find($applicationId);

    return $application && $user->hasAccessToApplication($application);
});

// Indicateur global "déploiements en cours" (sidebar/header) — accessible à
// tout membre du workspace, pas seulement à ceux ayant accès à l'application
// concernée (voir DeploymentStatusUpdated/DeploymentStepUpdated).
Broadcast::channel('workspace.{workspaceId}', function (User $user, int $workspaceId) {
    $workspace = Workspace::find($workspaceId);

    return $workspace && $user->roleInWorkspace($workspace) !== null;
});
