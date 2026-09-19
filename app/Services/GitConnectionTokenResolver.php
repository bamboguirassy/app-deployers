<?php

namespace App\Services;

use App\Models\GitConnection;
use App\Models\Target;

/**
 * Retrouve le token OAuth déjà obtenu pour ce workspace/provider via
 * GitRepositorySection.tsx + GitConnectionController (scope `repo`, donne
 * accès aux dépôts privés) — c'est le seul mécanisme de credential Git
 * réellement câblé côté UI aujourd'hui. Utilisé par GitCloner comme unique
 * source de credential (repli sur un clone anonyme si absent).
 */
class GitConnectionTokenResolver
{
    public function resolve(Target $target): ?string
    {
        return GitConnection::query()
            ->where('workspace_id', $target->application->workspace_id)
            ->where('provider', $target->repository_provider)
            ->first()
            ?->access_token;
    }
}
