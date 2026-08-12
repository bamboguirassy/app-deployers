<?php

namespace App\Concerns;

use App\Models\Workspace;

/**
 * Vérification explicite d'appartenance à un workspace, à utiliser à la place
 * des `abort_unless($model->workspace_id === $workspace->id)` dispersés dans
 * les contrôleurs. Volontairement PAS un scope Eloquent global : RunDeploymentJob
 * et les commandes artisan n'ont aucun "workspace courant" implicite (pas de
 * middleware SetPermissionsTeam hors requête HTTP), donc tout filtrage
 * automatique basé sur un état ambiant serait soit vide, soit pollué par un
 * résidu d'un job précédent dans le même worker. Le workspace attendu doit
 * toujours être passé explicitement.
 */
trait BelongsToWorkspace
{
    public function belongsToWorkspace(Workspace $workspace): bool
    {
        return $this->resolveWorkspaceId() === $workspace->id;
    }

    abstract public function resolveWorkspaceId(): ?int;
}
