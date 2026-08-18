<?php

namespace App\Notifications;

use App\Models\Application;
use App\Models\Workspace;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ApplicationInvitationNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public string $token,
        public Application $application,
        public Workspace $workspace,
    ) {}

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
            ->subject("Invitation à rejoindre {$this->application->name}")
            ->line("Vous avez été invité à rejoindre l'application **{$this->application->name}** sur App Deployer.")
            ->line("Un compte a été créé pour vous. Définissez votre mot de passe pour commencer.")
            ->action('Définir mon mot de passe', $url)
            ->line('Ce lien expire dans 60 minutes.');
    }
}
