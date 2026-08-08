<?php

return [
    'queue' => env('DEPLOY_QUEUE', 'deploy'),
    'default_timeout_seconds' => (int) env('DEPLOY_TIMEOUT', 900),
    'lock_ttl_minutes' => 20,
    'error_excerpt_length' => 2000,
];
