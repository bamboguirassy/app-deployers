<?php

namespace App\Notifications;

use App\Models\Subscription;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Queue\SerializesModels;

class SubscriptionPastDueNotification extends Notification implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public Subscription $subscription) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $workspace = $this->subscription->workspace;
        $days = (int) now()->diffInDays($this->subscription->grace_period_ends_at, false);

        return (new MailMessage)
            ->error()
            ->subject("Échec de paiement — {$workspace->name}")
            ->line("Le dernier paiement de l'abonnement de \"{$workspace->name}\" a échoué.")
            ->line("Vous gardez l'accès à votre plan actuel encore {$days} jour(s) avant un retour automatique au plan Free.")
            ->action('Régulariser le paiement', route('billing.show', $workspace->slug))
            ->line('Passé ce délai, le workspace repassera automatiquement au plan Free.');
    }
}
