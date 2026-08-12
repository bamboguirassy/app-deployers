<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

/**
 * Bootstrap du tout premier super-admin : il n'existe aucun chemin UI pour
 * accorder ce rôle (chicken-and-egg), donc cette commande artisan est le seul
 * moyen de promouvoir quelqu'un avant qu'un super-admin existant puisse le
 * faire depuis /admin/users.
 */
#[Signature('admin:promote {email : Adresse email de l\'utilisateur à promouvoir}')]
#[Description('Accorde les droits super-admin (accès plateforme /admin) à un utilisateur existant, par email.')]
class PromoteSuperAdmin extends Command
{
    public function handle(): int
    {
        $email = $this->argument('email');
        $user = User::where('email', $email)->first();

        if (! $user) {
            $this->error("Aucun utilisateur trouvé avec l'email {$email}.");

            return self::FAILURE;
        }

        if ($user->isSuperAdmin()) {
            $this->info("{$user->email} est déjà super-admin.");

            return self::SUCCESS;
        }

        $user->update(['is_super_admin' => true]);

        $this->info("{$user->email} est désormais super-admin.");

        return self::SUCCESS;
    }
}
