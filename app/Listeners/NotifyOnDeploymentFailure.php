<?php

namespace App\Listeners;

use App\Events\DeploymentStatusUpdated;
use App\Models\User;
use App\Notifications\DeploymentFailedNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Notification;

/**
 * Couvre uniformément tous les chemins qui font passer un déploiement en
 * "echec" (RunDeploymentJob::handle, son catch d'exception, failed(), et
 * App\Console\Commands\ReconcileStuckDeployments) puisqu'ils broadcastent
 * tous DeploymentStatusUpdated au moment de la transition de statut — pas
 * besoin de dupliquer l'envoi de notification à chaque site d'appel.
 */
class NotifyOnDeploymentFailure implements ShouldQueue
{
    public function handle(DeploymentStatusUpdated $event): void
    {
        $deployment = $event->deployment;

        if ($deployment->status !== 'echec') {
            return;
        }

        $deployment->loadMissing([
            'targetEnvironment.target.application.workspace',
            'targetEnvironment.environment',
            'triggeredBy',
        ]);

        $application = $deployment->targetEnvironment->target->application;
        $settings    = $application->getOrCreateNotificationSettings();

        if (! $settings->notify_on_failure) {
            return;
        }

        if (! Cache::add("notify:failure:{$deployment->id}", true, now()->addHour())) {
            return;
        }

        $workspace  = $application->workspace;
        $ownerIds   = $workspace->members()->where('role', 'owner')->pluck('id');
        $recipients = User::whereIn('id', $ownerIds)->get();

        if ($deployment->triggeredBy && ! $recipients->contains('id', $deployment->triggeredBy->id)) {
            $recipients->push($deployment->triggeredBy);
        }

        if ($recipients->isEmpty()) {
            return;
        }

        Notification::send($recipients, new DeploymentFailedNotification($deployment));
    }
}
