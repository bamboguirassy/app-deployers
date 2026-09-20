<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Source unique des montants affichés pour le plan Pro : ils sont lus chez
 * Paddle plutôt que recopiés à la main côté front. Avant, `constants/pricing.ts`
 * portait les montants en dur avec un commentaire disant qu'il fallait les
 * répercuter manuellement à chaque changement de tarif — un prix affiché
 * différent du prix débité n'est pas un défaut d'affichage, c'est une
 * exposition commerciale et juridique.
 *
 * Contraintes qui dictent la forme de cette classe :
 * - `/tarifs` et `/pricing` sont **publiques, non authentifiées et rendues
 *   côté serveur (SSR)** pour le SEO. La lecture ne doit donc jamais lever,
 *   jamais bloquer, et ne jamais permettre à un visiteur de déclencher un
 *   appel Paddle par requête (sinon n'importe qui peut faire consommer notre
 *   quota d'API).
 * - D'où trois niveaux de repli : cache chaud → dernier prix connu (écrit
 *   sans expiration à chaque succès) → montants de repli codés ici.
 *
 * Le cache est maintenu chaud par `paddle:sync-prices` (planifié toutes les
 * heures) ; le rafraîchissement opportuniste ci-dessous ne sert qu'au cas du
 * cache totalement froid (première installation, cache vidé), et il est
 * sérialisé par un verrou pour qu'une seule requête tente l'appel.
 */
class PaddlePriceCatalog
{
    public const CACHE_KEY = 'paddle:prices:pro';

    /** Dernier prix effectivement obtenu de Paddle — écrit sans expiration. */
    public const LAST_KNOWN_KEY = 'paddle:prices:pro:last-known';

    private const REFRESH_LOCK_KEY = 'paddle:prices:pro:refresh';

    /**
     * Repli ultime, utilisé uniquement si Paddle n'a jamais répondu depuis
     * cette installation. Doit rester aligné sur les tarifs réellement
     * configurés côté Paddle.
     *
     * @var array<string, array{amount: int, currency: string}>
     */
    public const FALLBACK = [
        'monthly' => ['amount' => 2000, 'currency' => 'EUR'],
        'yearly' => ['amount' => 20000, 'currency' => 'EUR'],
    ];

    public function __construct(private PaddleClient $client) {}

    /**
     * Montants à afficher. Ne lève jamais.
     *
     * @return array<string, array{amount: int, currency: string}>
     */
    public function proPrices(): array
    {
        $cached = Cache::get(self::CACHE_KEY);

        if (is_array($cached)) {
            return $cached;
        }

        // Cache froid : une seule requête tente le rafraîchissement, les
        // autres servent immédiatement le dernier prix connu.
        $lock = Cache::lock(self::REFRESH_LOCK_KEY, 15);

        if ($lock->get()) {
            try {
                return $this->refresh();
            } catch (Throwable $e) {
                Log::warning('Paddle price refresh failed — serving last known prices', [
                    'error' => $e->getMessage(),
                ]);
            } finally {
                $lock->release();
            }
        }

        return $this->lastKnownOrFallback();
    }

    /**
     * Interroge Paddle et met le cache à jour. Lève si Paddle est
     * injoignable — c'est à l'appelant (commande planifiée, ou le repli de
     * proPrices()) de décider quoi en faire.
     *
     * @return array<string, array{amount: int, currency: string}>
     */
    public function refresh(): array
    {
        $prices = [];

        foreach (['monthly' => 'pro_price_id_monthly', 'yearly' => 'pro_price_id_yearly'] as $interval => $configKey) {
            $priceId = config("paddle.{$configKey}");

            if (! $priceId) {
                continue;
            }

            $prices[$interval] = $this->client->getPrice($priceId);
        }

        if ($prices === []) {
            // Aucun price id configuré : inutile de mettre en cache un
            // résultat vide qui masquerait le repli pendant 6 h.
            return $this->lastKnownOrFallback();
        }

        $prices = array_merge($this->lastKnownOrFallback(), $prices);

        Cache::put(self::CACHE_KEY, $prices, now()->addMinutes((int) config('paddle.price_cache_ttl_minutes')));
        Cache::forever(self::LAST_KNOWN_KEY, $prices);

        return $prices;
    }

    /**
     * @return array<string, array{amount: int, currency: string}>
     */
    private function lastKnownOrFallback(): array
    {
        $lastKnown = Cache::get(self::LAST_KNOWN_KEY);

        return is_array($lastKnown) ? $lastKnown : self::FALLBACK;
    }
}
