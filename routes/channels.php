<?php

use App\Models\Application;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('application.{applicationId}', function (User $user, int $applicationId) {
    $application = Application::find($applicationId);

    return $application && $user->hasAccessToApplication($application);
});
