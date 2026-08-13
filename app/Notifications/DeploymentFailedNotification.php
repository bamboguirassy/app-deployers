<?php

namespace App\Notifications;

use App\Models\Deployment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\HtmlString;

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

        $failedStep = $this->deployment->steps->firstWhere('status', 'echec');

        $facts = [
            'Application' => $application->name,
            'Cible' => "{$target->name} → {$environment->name}",
            'Branche' => $this->deployment->branch ?? '—',
        ];

        if ($failedStep) {
            $facts['Étape en échec'] = $failedStep->label_snapshot.($failedStep->exit_code !== null ? " (code {$failedStep->exit_code})" : '');
        }

        $escapeCell = fn (string $value) => str_replace('|', '\\|', e($value));

        $table = "| Champ | Valeur |\n|:--|--:|\n";
        foreach ($facts as $label => $value) {
            $table .= '| '.$escapeCell($label).' | '.$escapeCell($value)." |\n";
        }

        return (new MailMessage)
            ->error()
            ->subject("Déploiement en échec — {$application->name} / {$target->name}")
            ->line("Le déploiement de \"{$target->name}\" vers \"{$environment->name}\" ({$application->name}) a échoué.")
            ->line(new HtmlString($table))
            ->action('Voir le déploiement', route('deployments.show', [
                $application->workspace->slug,
                $application->slug,
                $this->deployment->uuid,
            ]))
            ->line("Consultez les logs de l'étape en échec pour plus de détails.");
    }
}
