<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Workspace;

class WorkspacePolicy
{
    public function view(User $user, Workspace $workspace): bool
    {
        return $user->roleInWorkspace($workspace) !== null;
    }

    public function manage(User $user, Workspace $workspace): bool
    {
        return $user->can('workspace.manage');
    }

    public function manageServers(User $user, Workspace $workspace): bool
    {
        return $user->can('servers.manage');
    }
}
