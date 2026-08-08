<?php

namespace App\Events;

use App\Models\Deployment;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

class DeploymentStatusUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets;

    public function __construct(
        public int $applicationId,
        public Deployment $deployment,
    ) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel("application.{$this->applicationId}")];
    }

    public function broadcastAs(): string
    {
        return 'deploiement.statut';
    }

    public function broadcastWith(): array
    {
        return [
            'deployment_id' => $this->deployment->id,
            'statut' => $this->deployment->status,
            'started_at' => $this->deployment->started_at?->toIso8601String(),
            'finished_at' => $this->deployment->finished_at?->toIso8601String(),
            'duration_ms' => $this->deployment->duration_ms,
        ];
    }
}
