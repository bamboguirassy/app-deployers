<?php

namespace App\Support;

use App\Models\Deployment;
use App\Models\DeploymentStep;

/**
 * Construit le contexte de variables partagé par tous les StepActions
 * (App\StepActions\*) — pas seulement le type "email". Toute action qui a
 * besoin de personnaliser son comportement avec des infos sur le
 * déploiement (webhook HTTP, notification Slack, etc. à venir) consomme le
 * même contexte, avec les mêmes clés.
 */
class DeploymentContextBuilder
{
    /**
     * $workspacePath : dossier local éphémère de ce déploiement
     * (storage/app/deployments/{id}/workspace), consommé par CloneStepAction/
     * SyncStepAction — toujours calculé par RunDeploymentJob, que le pipeline
     * s'en serve ou non (nettoyé en fin de déploiement dans tous les cas).
     */
    public static function build(Deployment $deployment, DeploymentStep $step, string $workspacePath): array
    {
        $targetEnvironment = $deployment->targetEnvironment;
        $target = $targetEnvironment->target;
        $application = $target->application;

        return [
            'workspace_path' => $workspacePath,
            'application' => [
                'name' => $application->name,
                'slug' => $application->slug,
            ],
            'environment' => [
                'name' => $targetEnvironment->environment->name,
            ],
            'target' => [
                'name' => $target->name,
            ],
            'deployment' => [
                'id' => $deployment->id,
                'status' => $deployment->status,
                'trigger_source' => $deployment->trigger_source,
                'triggered_by' => $deployment->triggeredBy?->name ?? 'automatique',
                'branch' => $deployment->branch,
                'commit_sha' => $deployment->commit_sha,
                'started_at' => $deployment->started_at?->format('d/m/Y H:i'),
            ],
            'step' => [
                'label' => $step->label_snapshot,
            ],
        ];
    }

    /**
     * Contexte fictif utilisé pour la prévisualisation côté formulaire
     * (aucun déploiement réel n'est en cours).
     */
    public static function sample(): array
    {
        return [
            'application' => ['name' => 'Mon Application', 'slug' => 'mon-application'],
            'environment' => ['name' => 'production'],
            'target' => ['name' => 'API'],
            'deployment' => [
                'id' => 123,
                'status' => 'succes',
                'trigger_source' => 'manual',
                'triggered_by' => 'Jean Dupont',
                'branch' => 'main',
                'commit_sha' => 'a1b2c3d',
                'started_at' => now()->format('d/m/Y H:i'),
            ],
            'step' => ['label' => 'Déploiement API'],
        ];
    }
}
