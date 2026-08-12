<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * Sortie incrémentale d'un step "command" en cours d'exécution — diffusée en
 * plus de DeploymentStepUpdated (qui ne porte que l'état final : succes,
 * exit_code, output tronqué complet). Émise par RunDeploymentJob, throttlée
 * côté job (pas ici) pour éviter de saturer Reverb sur une commande très
 * verbeuse. Un morceau manquant en fin de step n'est pas un problème : la
 * sortie complète reste disponible via DeploymentStepUpdated une fois le
 * step terminé.
 */
class DeploymentStepOutputAppended implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets;

    public function __construct(
        public int $applicationId,
        public int $deploymentId,
        public int $stepId,
        public string $chunk,
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel("application.{$this->applicationId}"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'deploiement.sortie';
    }

    public function broadcastWith(): array
    {
        return [
            'deployment_id' => $this->deploymentId,
            'step_id' => $this->stepId,
            'chunk' => $this->chunk,
        ];
    }
}
