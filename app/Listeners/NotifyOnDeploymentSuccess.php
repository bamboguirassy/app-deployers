<?php

namespace App\Listeners;

use App\Events\DeploymentStatusUpdated;
use App\Notifications\DeploymentSucceededNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Notification;

/**
 * Notifie le déclencheur (et lui seul) quand un déploiement passe en « succes ».
 * Les owners ne sont pas notifiés pour les succès afin d'éviter le bruit —
 * seul l'utilisateur qui a déclenché le déploiement reçoit la confirmation.
 */
class NotifyOnDeploymentSuccess implements ShouldQueue
{
    public function handle(DeploymentStatusUpdated $event): void
    {
        $deployment = $event->deployment;

        if ($deployment->status !== 'succes') {
            return;
        }

        $deployment->loadMissing([
            'targetEnvironment.target.application.workspace',
            'targetEnvironment.environment',
            'triggeredBy',
        ]);

        $application = $deployment->targetEnvironment->target->application;
        $settings    = $application->getOrCreateNotificationSettings();

        if (! $settings->notify_on_success) {
            return;
        }

        if (! $deployment->triggeredBy) {
            return;
        }

        Notification::send($deployment->triggeredBy, new DeploymentSucceededNotification($deployment));
    }
}
