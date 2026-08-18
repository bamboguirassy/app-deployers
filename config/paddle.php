<?php

return [
    'api_key' => env('PADDLE_API_KEY'),
    'webhook_secret' => env('PADDLE_WEBHOOK_SECRET'),
    'sandbox' => (bool) env('PADDLE_SANDBOX', false),

    // Jeton PUBLIC (préfixe `test_`/`live_`), distinct de la clé API secrète
    // ci-dessus : c'est celui-ci que Paddle.js utilise côté navigateur pour
    // ouvrir l'overlay de checkout. Sûr à exposer dans les props Inertia.
    'client_token' => env('PADDLE_CLIENT_TOKEN'),
    'grace_period_days' => (int) env('PADDLE_GRACE_PERIOD_DAYS', 7),

    // Domaines approuvés dans Paddle (Checkout > Website approval), séparés
    // par des virgules. Tant que le domaine courant n'y figure pas, on ne
    // passe pas de checkout.url explicite lors de la création de transaction
    // (Paddle utilise alors son "Default payment link" configuré côté
    // dashboard) — sinon l'API rejette la requête avec
    // transaction_checkout_url_domain_is_not_approved.
    'approved_checkout_domains' => env('PADDLE_APPROVED_CHECKOUT_DOMAINS', ''),

    // Tolérance sur l'âge du timestamp signé dans le header Paddle-Signature,
    // pour se protéger d'une attaque par replay tout en laissant une marge
    // raisonnable au délai de livraison du webhook.
    'signature_tolerance_seconds' => (int) env('PADDLE_SIGNATURE_TOLERANCE_SECONDS', 300),

    'pro_price_id_monthly' => env('PADDLE_PRO_PRICE_ID_MONTHLY'),
    'pro_price_id_yearly' => env('PADDLE_PRO_PRICE_ID_YEARLY'),
];
