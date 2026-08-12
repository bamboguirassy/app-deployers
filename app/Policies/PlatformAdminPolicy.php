<?php

namespace App\Policies;

use App\Models\User;

/**
 * Policy non liée à un modèle, pour les abilities du panneau super-admin.
 * Toutes les abilities se réduisent pour l'instant à is_super_admin — pas de
 * granularité plus fine demandée dans cette itération.
 */
class PlatformAdminPolicy
{
    public function access(User $user): bool
    {
        return $user->isSuperAdmin();
    }

    public function manageWorkspaces(User $user): bool
    {
        return $user->isSuperAdmin();
    }

    public function manageSubscriptions(User $user): bool
    {
        return $user->isSuperAdmin();
    }

    public function manageUsers(User $user): bool
    {
        return $user->isSuperAdmin();
    }

    public function managePlans(User $user): bool
    {
        return $user->isSuperAdmin();
    }
}
