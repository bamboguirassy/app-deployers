<?php

return [
    'queue' => env('DEPLOY_QUEUE', 'deploy'),
    'default_timeout_seconds' => (int) env('DEPLOY_TIMEOUT', 900),
    'lock_ttl_minutes' => 20,
    'error_excerpt_length' => 2000,

    // Concurrence de déploiement (plan du workspace) : un déploiement sans
    // slot disponible n'échoue pas, il se remet en file toutes les N
    // secondes jusqu'à expiration de queue_wait_timeout_minutes.
    'concurrency_retry_seconds' => (int) env('DEPLOY_CONCURRENCY_RETRY_SECONDS', 10),
    'queue_wait_timeout_minutes' => (int) env('DEPLOY_QUEUE_WAIT_TIMEOUT_MINUTES', 120),

    // Filet de sécurité pour deploy:reconcile-stuck (voir cette commande) :
    // au-delà de ce délai sans mise à jour, un déploiement "running" est
    // considéré abandonné (worker tué sans passer par le bloc finally du
    // job) et repassé en échec. Doit rester nettement supérieur à la durée
    // maximale attendue d'un déploiement (somme des timeouts de pipeline).
    'stuck_running_after_minutes' => (int) env('DEPLOY_STUCK_RUNNING_AFTER_MINUTES', 60),
];
