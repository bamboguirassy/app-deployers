<?php

namespace App\Models;

use App\Concerns\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeploymentStep extends Model
{
    use BelongsToWorkspace;

    protected $fillable = [
        'deployment_id', 'pipeline_step_id', 'label_snapshot', 'type', 'config_snapshot', 'order',
        'status', 'exit_code', 'output', 'pid', 'started_at', 'finished_at', 'duration_ms',
    ];

    protected function casts(): array
    {
        return [
            'config_snapshot' => 'array',
            'started_at' => 'datetime',
            'finished_at' => 'datetime',
        ];
    }

    public function deployment(): BelongsTo
    {
        return $this->belongsTo(Deployment::class);
    }

    public function pipelineStep(): BelongsTo
    {
        return $this->belongsTo(PipelineStep::class);
    }

    public function resolveWorkspaceId(): ?int
    {
        return $this->deployment->resolveWorkspaceId();
    }
}
