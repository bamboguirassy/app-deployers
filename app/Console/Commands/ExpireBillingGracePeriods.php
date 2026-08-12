<?php

namespace App\Console\Commands;

use App\Models\Subscription;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('billing:expire-grace-periods')]
#[Description('Repasse au plan free les workspaces dont la grâce (échec de paiement) est expirée')]
class ExpireBillingGracePeriods extends Command
{
    public function handle(): void
    {
        $count = Subscription::query()
            ->where('status', 'past_due')
            ->where('grace_period_ends_at', '<', now())
            ->update(['status' => 'canceled']);

        $this->info("{$count} abonnement(s) repassé(s) au plan free après expiration de la grâce.");
    }
}
