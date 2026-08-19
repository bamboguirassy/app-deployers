<?php

namespace App\Listeners;

use App\Events\DeploymentStatusUpdated;
use App\Notifications\DeploymentStartedNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Notification;

class NotifyOnDeploymentStarted implements ShouldQueue
{
    public function handle(DeploymentStatusUpdated $event): void
    {
        $deployment = $event->deployment;

        if ($deployment->status !== 'running') {
            return;
        }

        $deployment->loadMissing([
            'targetEnvironment.target.application',
            'targetEnvironment.environment',
        ]);

        $application = $deployment->targetEnvironment->target->application;
        $settings    = $application->getOrCreateNotificationSettings();

        if (! $settings->notify_on_start) {
            return;
        }

        // Cache::add() returns false if the key already exists — prevents double-send
        // if the event is somehow dispatched twice (retry, duplicate dispatch, etc.).
        if (! Cache::add("notify:started:{$deployment->id}", true, now()->addHour())) {
            return;
        }

        $recipients = $application->users()
            ->whereNull('users.suspended_at')
            ->wherePivot('invitation_pending', false)
            ->get();

        if ($recipients->isEmpty()) {
            return;
        }

        Notification::send($recipients, new DeploymentStartedNotification($deployment));
    }
}
