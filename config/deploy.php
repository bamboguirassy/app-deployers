<?php

return [
    'queue' => env('DEPLOY_QUEUE', 'deploy'),
    'default_timeout_seconds' => (int) env('DEPLOY_TIMEOUT', 900),
    'error_excerpt_length' => 2000,

    // Concurrence de déploiement (plan du workspace) : un déploiement sans
    // slot disponible n'échoue pas, il se remet en file jusqu'à expiration de
    // queue_wait_timeout_minutes.
    //
    // Délai de base avant une nouvelle tentative de réservation de slot, puis
    // plafond et facteur de croissance : le délai double à chaque tentative
    // jusqu'au plafond. Un déploiement en file rejouait sinon son job toutes
    // les 10 s pendant toute l'attente (jusqu'à 720 fois sur 2 h), en pure
    // perte et au détriment des workers partagés entre tous les clients.
    // Attention : ce délai EST la latence entre la libération d'un slot et le
    // démarrage du déploiement suivant — un job différé ne peut pas être
    // avancé dans Redis. Augmenter le plafond économise des réveils et rend
    // la file d'autant moins réactive.
    'concurrency_retry_seconds' => (int) env('DEPLOY_CONCURRENCY_RETRY_SECONDS', 10),
    'concurrency_retry_max_seconds' => (int) env('DEPLOY_CONCURRENCY_RETRY_MAX_SECONDS', 30),
    'concurrency_retry_factor' => (int) env('DEPLOY_CONCURRENCY_RETRY_FACTOR', 2),
    'queue_wait_timeout_minutes' => (int) env('DEPLOY_QUEUE_WAIT_TIMEOUT_MINUTES', 120),

    // Filet de sécurité pour deploy:reconcile-stuck (voir cette commande) :
    // au-delà de ce délai sans mise à jour, un déploiement "running" est
    // considéré abandonné (worker tué sans passer par le bloc finally du
    // job) et repassé en échec. Doit rester nettement supérieur à la durée
    // maximale attendue d'un déploiement (somme des timeouts de pipeline).
    'stuck_running_after_minutes' => (int) env('DEPLOY_STUCK_RUNNING_AFTER_MINUTES', 60),

    // Même filet pour les déploiements restés "pending" alors que leur job a
    // disparu sans jamais s'exécuter (file Redis vidée, Horizon purgé) :
    // retryUntil()/failed() ne peut rien pour eux puisqu'il n'y a plus de job.
    // L'occupation d'un environnement étant dérivée des déploiements non
    // terminés (DeploymentService::assertNoActiveDeployment), un tel fantôme
    // bloquerait sinon l'environnement indéfiniment. Doit rester supérieur à
    // queue_wait_timeout_minutes, sinon on abandonnerait des déploiements qui
    // attendent encore légitimement un slot.
    'stuck_pending_after_minutes' => (int) env(
        'DEPLOY_STUCK_PENDING_AFTER_MINUTES',
        (int) env('DEPLOY_QUEUE_WAIT_TIMEOUT_MINUTES', 120) + 30,
    ),

    // Délai maximal pour la synchronisation post-build (App\Transports) en
    // mode centralisé — potentiellement plus long qu'un step de pipeline
    // classique (transfert d'un build entier plutôt qu'une commande).
    'sync_timeout_seconds' => (int) env('DEPLOY_SYNC_TIMEOUT_SECONDS', 1800),

    // Explorateur de dossiers local (filesystem du serveur d'application).
    // Désactivé par défaut — l'admin doit l'activer explicitement.
    'local_browse_enabled' => (bool) env('LOCAL_BROWSE_ENABLED', false),
    'local_browse_root' => env('LOCAL_BROWSE_ROOT', '/var/www'),
];
