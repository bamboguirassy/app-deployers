<?php

namespace App\Services;

use RuntimeException;

class WorkspaceQuotaExceededException extends RuntimeException
{
    public function __construct(int $limit)
    {
        parent::__construct(
            "Limite de {$limit} workspace(s) atteinte pour votre plan actuel — passez au plan supérieur pour en créer davantage."
        );
    }
}
