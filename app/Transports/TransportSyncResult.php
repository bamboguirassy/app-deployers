<?php

namespace App\Transports;

/**
 * Miroir de App\StepActions\StepExecutionResult pour la synchronisation
 * post-build (rsync/SFTP/FTP) — même contrat de statut, un exitCode process
 * n'a pas de sens ici (les transports sftp/ftp n'en produisent pas).
 */
class TransportSyncResult
{
    public function __construct(
        public readonly string $output,
        public readonly bool $success,
        public readonly bool $cancelled = false,
    ) {}

    public function status(): string
    {
        return match (true) {
            $this->cancelled => 'annule',
            $this->success => 'succes',
            default => 'echec',
        };
    }
}
