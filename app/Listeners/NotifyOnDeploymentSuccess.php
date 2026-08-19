<?php

namespace App\Listeners;

use App\Events\DeploymentStatusUpdated;
use App\Notifications\DeploymentSucceededNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Notification;

class NotifyOnDeploymentSuccess implements ShouldQueue
{
    public function handle(DeploymentStatusUpdated $event): void
    {
        $deployment = $event->deployment;

        if ($deployment->status !== 'succes') {
            return;
        }

        $deployment->loadMissing([
            'targetEnvironment.target.application',
            'targetEnvironment.environment',
        ]);

        $application = $deployment->targetEnvironment->target->application;
        $settings    = $application->getOrCreateNotificationSettings();

        if (! $settings->notify_on_success) {
            return;
        }

        if (! Cache::add("notify:success:{$deployment->id}", true, now()->addHour())) {
            return;
        }

        $recipients = $application->users()
            ->whereNull('users.suspended_at')
            ->wherePivot('invitation_pending', false)
            ->get();

        if ($recipients->isEmpty()) {
            return;
        }

        Notification::send($recipients, new DeploymentSucceededNotification($deployment));
    }
}
