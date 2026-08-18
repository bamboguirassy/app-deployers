<?php

namespace App\Notifications;

use App\Models\Deployment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\HtmlString;

class DeploymentSucceededNotification extends Notification implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public Deployment $deployment) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $target      = $this->deployment->targetEnvironment->target;
        $environment = $this->deployment->targetEnvironment->environment;
        $application = $target->application;

        $facts = [
            'Application' => $application->name,
            'Cible'       => "{$target->name} → {$environment->name}",
            'Branche'     => $this->deployment->branch ?? '—',
        ];

        if ($this->deployment->duration_ms !== null) {
            $facts['Durée'] = round($this->deployment->duration_ms / 1000, 1).' s';
        }

        $escapeCell = fn (string $value) => str_replace('|', '\\|', e($value));

        $table = "| Champ | Valeur |\n|:--|--:|\n";
        foreach ($facts as $label => $value) {
            $table .= '| '.$escapeCell($label).' | '.$escapeCell($value)." |\n";
        }

        return (new MailMessage)
            ->success()
            ->subject("Déploiement réussi — {$application->name} / {$target->name}")
            ->line("Le déploiement de \"{$target->name}\" vers \"{$environment->name}\" ({$application->name}) s'est terminé avec succès.")
            ->line(new HtmlString($table))
            ->action('Voir le déploiement', route('deployments.show', [
                $application->workspace->slug,
                $application->slug,
                $this->deployment->uuid,
            ]));
    }
}
