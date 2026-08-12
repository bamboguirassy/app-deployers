<?php

namespace App\Notifications;

use App\Models\Deployment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Queue\SerializesModels;

class DeploymentFailedNotification extends Notification implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public Deployment $deployment) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $target = $this->deployment->targetEnvironment->target;
        $environment = $this->deployment->targetEnvironment->environment;
        $application = $target->application;

        return (new MailMessage)
            ->error()
            ->subject("Déploiement en échec — {$application->name} / {$target->name}")
            ->line("Le déploiement de \"{$target->name}\" vers \"{$environment->name}\" ({$application->name}) a échoué.")
            ->line('Branche : '.($this->deployment->branch ?? '—'))
            ->action('Voir le déploiement', route('deployments.show', [
                $application->workspace->slug,
                $application->slug,
                $this->deployment->uuid,
            ]))
            ->line("Consultez les logs de l'étape en échec pour plus de détails.");
    }
}
