<?php

namespace App\Policies;

use App\Models\Application;
use App\Models\User;

class ApplicationPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Application $application): bool
    {
        return $user->hasAccessToApplication($application);
    }

    public function create(User $user): bool
    {
        return $user->can('applications.create');
    }

    public function update(User $user, Application $application): bool
    {
        return $user->can('applications.manage') && $user->hasAccessToApplication($application);
    }

    public function manageTargetsAndPipeline(User $user, Application $application): bool
    {
        return $user->can('pipeline.manage') && $user->hasAccessToApplication($application);
    }

    public function manageEnvironments(User $user, Application $application): bool
    {
        return $user->can('environments.manage') && $user->hasAccessToApplication($application);
    }

    public function deploy(User $user, Application $application): bool
    {
        return $user->can('deployments.trigger') && $user->hasAccessToApplication($application);
    }

    public function delete(User $user, Application $application): bool
    {
        return $user->can('applications.manage') && $user->hasAccessToApplication($application);
    }
}
