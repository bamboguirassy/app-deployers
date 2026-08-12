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
        public int $workspaceId,
        public Deployment $deployment,
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel("application.{$this->applicationId}"),
            // Permet un indicateur "déploiements en cours" global au workspace
            // (sidebar/header), sans devoir s'abonner à chaque application.
            new PrivateChannel("workspace.{$this->workspaceId}"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'deploiement.statut';
    }

    public function broadcastWith(): array
    {
        $targetEnvironment = $this->deployment->targetEnvironment;
        $target = $targetEnvironment->target;
        $application = $target->application;
        $workspace = $application->workspace;

        return [
            'deployment_id' => $this->deployment->id,
            'statut' => $this->deployment->status,
            'started_at' => $this->deployment->started_at?->toIso8601String(),
            'finished_at' => $this->deployment->finished_at?->toIso8601String(),
            'duration_ms' => $this->deployment->duration_ms,
            // Contexte suffisant pour rendre une ligne dans le widget global
            // "déploiements en cours" sans requête supplémentaire côté front.
            'application_name' => $application->name,
            'target_name' => $target->name,
            'environment_name' => $targetEnvironment->environment->name,
            'show_url' => route('deployments.show', [$workspace->slug, $application->slug, $this->deployment->uuid]),
            'steps_total' => $this->deployment->steps()->count(),
            'steps_done' => $this->deployment->steps()->whereIn('status', ['succes', 'echec', 'annule', 'skipped'])->count(),
        ];
    }
}
