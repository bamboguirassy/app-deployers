<?php

namespace App\Notifications;

use App\Models\Subscription;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Queue\SerializesModels;

class SubscriptionRevertedToFreeNotification extends Notification implements ShouldQueue
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

        return (new MailMessage)
            ->error()
            ->subject("Retour au plan Free — {$workspace->name}")
            ->line("Le délai de grâce accordé après l'échec de paiement de \"{$workspace->name}\" est expiré.")
            ->line('Le workspace est repassé automatiquement au plan Free — certaines fonctionnalités et limites du plan Pro ne sont plus disponibles.')
            ->action('Voir la facturation', route('billing.show', $workspace->slug));
    }
}
