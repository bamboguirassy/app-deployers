<?php

namespace App\Console\Commands;

use App\Services\PaddlePriceCatalog;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Throwable;

/**
 * Maintient chaud le cache des montants Paddle affichés sur /tarifs, /pricing
 * et la page de facturation. Planifié toutes les heures (routes/console.php) :
 * un changement de tarif côté Paddle se reflète dans l'app sans redéploiement,
 * et aucun visiteur ne paie la latence d'un appel API sur une page publique.
 *
 * Un échec ici n'est pas critique : PaddlePriceCatalog sert alors le dernier
 * prix connu. On sort quand même en erreur pour que ce soit visible dans les
 * logs du scheduler.
 */
#[Signature('paddle:sync-prices')]
#[Description('Rafraîchit depuis Paddle les montants affichés pour le plan Pro')]
class SyncPaddlePrices extends Command
{
    public function handle(PaddlePriceCatalog $catalog): int
    {
        try {
            $prices = $catalog->refresh();
        } catch (Throwable $e) {
            $this->error("Impossible de récupérer les tarifs Paddle : {$e->getMessage()}");
            $this->line('Les pages tarifs continuent de servir le dernier prix connu.');

            return self::FAILURE;
        }

        foreach ($prices as $interval => $price) {
            $this->info(sprintf(
                '%s : %s %s',
                $interval,
                number_format($price['amount'] / 100, 2, ',', ' '),
                $price['currency'],
            ));
        }

        return self::SUCCESS;
    }
}
