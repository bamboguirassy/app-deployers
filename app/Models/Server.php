<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Server extends Model
{
    protected $fillable = [
        'workspace_id',
        'name',
        'host',
        'port',
        'username',
        'auth_method',
        'password',
        'private_key',
        'passphrase',
        'created_by',
    ];

    /**
     * Les identifiants ne doivent jamais être sérialisés implicitement (props
     * Inertia, API) : comme pour les secrets webhook, ils ne sont manipulés
     * que côté serveur (connexion SSH, formulaire d'édition explicite).
     */
    protected $hidden = ['password', 'private_key', 'passphrase'];

    protected function casts(): array
    {
        return [
            'password' => 'encrypted',
            'private_key' => 'encrypted',
            'passphrase' => 'encrypted',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Server $server) {
            $server->uuid ??= (string) Str::uuid();
        });
    }

    public function usesPassword(): bool
    {
        return $this->auth_method === 'password';
    }

    public function usesSshKey(): bool
    {
        return $this->auth_method === 'ssh_key';
    }

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function targetEnvironments(): HasMany
    {
        return $this->hasMany(TargetEnvironment::class);
    }
}
