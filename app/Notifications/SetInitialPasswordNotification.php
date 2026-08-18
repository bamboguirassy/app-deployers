<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SetInitialPasswordNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public string $token)
    {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $url = route('password.reset', [
            'token' => $this->token,
            'email' => $notifiable->getEmailForPasswordReset(),
            'first_login' => '1',
        ]);

        return (new MailMessage)
            ->subject('Votre compte App Deployer a été créé')
            ->line('Un compte vient d\'être créé pour vous sur App Deployer.')
            ->action('Définir mon mot de passe', $url)
            ->line('Ce lien expire dans 60 minutes.');
    }
}
