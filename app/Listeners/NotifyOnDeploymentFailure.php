<?php

namespace App\Listeners;

use App\Events\DeploymentStatusUpdated;
use App\Models\Deployment;
use App\Models\User;
use App\Notifications\DeploymentFailedNotification;
use App\Notifications\DeploymentNeverStartedNotification;
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
        $settings = $application->getOrCreateNotificationSettings();

        if (! $settings->notify_on_failure) {
            return;
        }

        if (! Cache::add("notify:failure:{$deployment->id}", true, now()->addHour())) {
            return;
        }

        $workspace = $application->workspace;
        $ownerIds = $workspace->members()->where('role', 'owner')->pluck('id');
        $recipients = User::whereIn('id', $ownerIds)->get();

        if ($deployment->triggeredBy && ! $recipients->contains('id', $deployment->triggeredBy->id)) {
            $recipients->push($deployment->triggeredBy);
        }

        if ($recipients->isEmpty()) {
            return;
        }

        // Un déploiement qui n'a jamais démarré (abandonné après
        // `deploy.queue_wait_timeout_minutes` faute de slot de concurrence)
        // n'a aucune étape en échec ni aucun log : lui envoyer le mail
        // d'échec standard, qui renvoie vers « les logs de l'étape en
        // échec », décrit une situation qui n'existe pas.
        $notification = $deployment->started_at === null
            && $deployment->queued_reason === Deployment::QUEUED_FOR_CONCURRENCY
                ? new DeploymentNeverStartedNotification($deployment)
                : new DeploymentFailedNotification($deployment);

        Notification::send($recipients, $notification);
    }
}
