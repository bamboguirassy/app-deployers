<?php

namespace App\Console\Commands;

use App\Models\Subscription;
use App\Models\User;
use App\Notifications\SubscriptionRevertedToFreeNotification;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Notification;

#[Signature('billing:expire-grace-periods')]
#[Description('Repasse au plan free les workspaces dont la grâce (échec de paiement) est expirée')]
class ExpireBillingGracePeriods extends Command
{
    public function handle(): void
    {
        // Un update() en masse ne permettrait pas de savoir individuellement
        // quels workspaces basculent pour les notifier — le volume attendu
        // (abonnements past_due dont la grâce vient d'expirer) reste faible,
        // donc la boucle n'est pas un souci de perf.
        $subscriptions = Subscription::query()
            ->where('status', 'past_due')
            ->where('grace_period_ends_at', '<', now())
            ->get();

        foreach ($subscriptions as $subscription) {
            $subscription->update(['status' => 'canceled', 'grace_period_ends_at' => null]);

            $ownerIds = $subscription->workspace->members()->where('role', 'owner')->pluck('id');
            $owners = User::whereIn('id', $ownerIds)->get();

            if ($owners->isNotEmpty()) {
                Notification::send($owners, new SubscriptionRevertedToFreeNotification($subscription));
            }
        }

        $this->info("{$subscriptions->count()} abonnement(s) repassé(s) au plan free après expiration de la grâce.");
    }
}
