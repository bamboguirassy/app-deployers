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

    /**
     * La page de facturation reste consultable par tous les membres du
     * workspace ; seule l'action de changement de plan est restreinte.
     */
    public function viewBilling(User $user, Workspace $workspace): bool
    {
        return $user->roleInWorkspace($workspace) !== null;
    }

    public function manageBilling(User $user, Workspace $workspace): bool
    {
        return $user->can('billing.manage');
    }
}
