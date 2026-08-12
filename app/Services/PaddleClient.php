<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

/**
 * Client HTTP minimal vers l'API Paddle Billing — pas de SDK tiers pour
 * éviter une dépendance dont la compatibilité avec cette version de Laravel
 * n'est pas garantie (voir plan de facturation). Le prix n'est jamais résolu
 * côté client : c'est cette classe qui crée la transaction côté serveur.
 */
class PaddleClient
{
    private function baseUrl(): string
    {
        return config('paddle.sandbox')
            ? 'https://sandbox-api.paddle.com'
            : 'https://api.paddle.com';
    }

    /**
     * @param  array<string, mixed>  $customData
     * @return array{id: string}
     */
    public function createTransaction(string $priceId, array $customData, string $checkoutUrl): array
    {
        $payload = [
            'items' => [
                ['price_id' => $priceId, 'quantity' => 1],
            ],
            'custom_data' => $customData,
        ];

        // Paddle rejette toute checkout.url dont le domaine n'est pas
        // explicitement approuvé dans les réglages du compte (Checkout >
        // Website approval) — en local/sandbox ce n'est en général pas le
        // cas, donc on ne l'envoie que si le domaine courant est
        // explicitement listé comme approuvé. Sinon on laisse Paddle utiliser
        // le "Default payment link" configuré côté dashboard.
        $approvedDomains = array_filter(explode(',', (string) config('paddle.approved_checkout_domains')));
        $checkoutHost = parse_url($checkoutUrl, PHP_URL_HOST);

        if ($checkoutHost && in_array($checkoutHost, $approvedDomains, true)) {
            $payload['checkout'] = ['url' => $checkoutUrl];
        }

        $response = Http::withToken(config('paddle.api_key'))
            ->baseUrl($this->baseUrl())
            ->post('/transactions', $payload)
            ->throw();

        return $response->json('data');
    }
}
