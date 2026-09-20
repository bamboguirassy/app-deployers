<?php

namespace App\Notifications;

use App\Models\Deployment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\HtmlString;

/**
 * Cas où un déploiement passe en échec sans avoir jamais démarré : il a
 * attendu un slot de déploiement simultané pendant tout
 * `deploy.queue_wait_timeout_minutes` (2 h par défaut) sans qu'aucun ne se
 * libère, et RunDeploymentJob::failed() l'a abandonné.
 *
 * Une notification distincte plutôt qu'un cas particulier de
 * DeploymentFailedNotification : celle-ci renvoie vers « les logs de l'étape
 * en échec », alors qu'ici aucune étape n'a tourné et qu'il n'existe aucun
 * log à consulter. La cause n'est pas dans le pipeline mais dans la capacité
 * du plan — le message doit le dire, et pointer vers la facturation.
 */
class DeploymentNeverStartedNotification extends Notification implements ShouldQueue
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
        $workspace = $application->workspace;
        $plan = $workspace->effectivePlan();

        $waitMinutes = (int) config('deploy.queue_wait_timeout_minutes');
        $waitLabel = $waitMinutes >= 60
            ? intdiv($waitMinutes, 60).' h'.($waitMinutes % 60 ? ' '.($waitMinutes % 60).' min' : '')
            : $waitMinutes.' min';

        $facts = [
            'Application' => $application->name,
            'Cible' => "{$target->name} → {$environment->name}",
            'Branche' => $this->deployment->branch ?? '—',
            'Plan' => $plan->name,
            'Déploiements simultanés' => $plan->max_concurrent_deployments === null
                ? 'illimités'
                : (string) $plan->max_concurrent_deployments,
            'Attente avant abandon' => $waitLabel,
        ];

        $escapeCell = fn (string $value) => str_replace('|', '\\|', e($value));

        $table = "| Champ | Valeur |\n|:--|--:|\n";
        foreach ($facts as $label => $value) {
            $table .= '| '.$escapeCell($label).' | '.$escapeCell($value)." |\n";
        }

        return (new MailMessage)
            ->error()
            ->subject("Déploiement jamais démarré — {$application->name} / {$target->name}")
            ->line("Le déploiement de \"{$target->name}\" vers \"{$environment->name}\" ({$application->name}) n'a jamais démarré : aucun slot de déploiement simultané ne s'est libéré en {$waitLabel}.")
            ->line("Aucune étape du pipeline n'a été exécutée — il n'y a donc rien à corriger dans le pipeline lui-même, et rien n'a été modifié sur le serveur cible.")
            ->line(new HtmlString($table))
            ->action('Voir le déploiement', route('deployments.show', [
                $workspace->slug,
                $application->slug,
                $this->deployment->uuid,
            ]))
            ->line('Relancez-le quand un déploiement en cours sera terminé, ou augmentez le nombre de déploiements simultanés de votre plan.');
    }
}
