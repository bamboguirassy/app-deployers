<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TargetEnvironment extends Model
{
    protected $fillable = ['target_id', 'environment_id', 'server_id', 'deploy_path', 'git_branch'];

    public function target(): BelongsTo
    {
        return $this->belongsTo(Target::class);
    }

    public function environment(): BelongsTo
    {
        return $this->belongsTo(Environment::class);
    }

    public function server(): BelongsTo
    {
        return $this->belongsTo(Server::class);
    }

    public function variables(): HasMany
    {
        return $this->hasMany(EnvironmentVariable::class);
    }

    public function deployments(): HasMany
    {
        return $this->hasMany(Deployment::class);
    }
}
