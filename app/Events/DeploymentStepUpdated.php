<?php

namespace App\Events;

use App\Models\DeploymentStep;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

class DeploymentStepUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets;

    public function __construct(
        public int $applicationId,
        public int $workspaceId,
        public DeploymentStep $step,
        public ?string $errorExcerpt = null,
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel("application.{$this->applicationId}"),
            new PrivateChannel("workspace.{$this->workspaceId}"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'deploiement.etape';
    }

    public function broadcastWith(): array
    {
        return [
            'deployment_id' => $this->step->deployment_id,
            'step_id' => $this->step->id,
            'label' => $this->step->label_snapshot,
            'statut' => $this->step->status,
            'exit_code' => $this->step->exit_code,
            'duration_ms' => $this->step->duration_ms,
            'error_excerpt' => $this->errorExcerpt,
        ];
    }
}
