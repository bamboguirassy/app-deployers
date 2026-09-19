<?php

namespace App\Models;

use App\Concerns\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

/**
 * Compte FTP ou SFTP dédié, rattaché à un Server — indépendant de son
 * éventuel accès SSH principal. Un même Server peut porter plusieurs
 * comptes (ex. un par application hébergée dessus en mutualisé) ;
 * chaque TargetEnvironment choisit lequel utiliser pour ses steps `sync`
 * (voir TargetEnvironment::ftpCredential()/sftpCredential()).
 */
class ServerCredential extends Model
{
    use BelongsToWorkspace;

    protected $fillable = ['server_id', 'type', 'label', 'username', 'password', 'private_key', 'passphrase'];

    protected $hidden = ['password', 'private_key', 'passphrase'];

    protected static function booted(): void
    {
        static::creating(function (ServerCredential $credential) {
            $credential->uuid ??= (string) Str::uuid();
        });
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    protected function casts(): array
    {
        return [
            'password' => 'encrypted',
            'private_key' => 'encrypted',
            'passphrase' => 'encrypted',
        ];
    }

    public function server(): BelongsTo
    {
        return $this->belongsTo(Server::class);
    }

    public function resolveWorkspaceId(): ?int
    {
        return $this->server->workspace_id;
    }
}
