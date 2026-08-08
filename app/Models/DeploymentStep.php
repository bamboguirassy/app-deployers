<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeploymentStep extends Model
{
    protected $fillable = [
        'deployment_id', 'pipeline_step_id', 'label_snapshot', 'command_snapshot', 'order',
        'status', 'exit_code', 'output', 'pid', 'started_at', 'finished_at', 'duration_ms',
    ];

    protected function casts(): array
    {
        return [
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
}
