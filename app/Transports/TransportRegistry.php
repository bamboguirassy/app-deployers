<?php

namespace App\Transports;

use InvalidArgumentException;

/**
 * Point d'entrée unique pour résoudre un `connection_type` vers son
 * implémentation — miroir de App\StepActions\StepActionRegistry. Ajouter un
 * nouveau transport = créer une classe implémentant TransportContract et
 * l'ajouter à $transports ci-dessous.
 */
class TransportRegistry
{
    /** @var class-string<TransportContract>[] */
    private array $transports = [
        SshRsyncTransport::class,
        SftpTransport::class,
        FtpTransport::class,
    ];

    public function get(string $type): TransportContract
    {
        foreach ($this->transports as $class) {
            if ($class::type() === $type) {
                return app($class);
            }
        }

        throw new InvalidArgumentException("Type de transport inconnu : {$type}");
    }

    public function has(string $type): bool
    {
        foreach ($this->transports as $class) {
            if ($class::type() === $type) {
                return true;
            }
        }

        return false;
    }

    public function types(): array
    {
        return array_map(fn ($class) => $class::type(), $this->transports);
    }
}
