<?php

namespace App\Services;

use App\Models\Server;
use phpseclib3\Crypt\PublicKeyLoader;
use phpseclib3\Net\SFTP;
use RuntimeException;
use Throwable;

class SftpDirectoryBrowser
{
    private const TIMEOUT_SECONDS = 10;

    /** Valeur SFTP "type=directory" (protocole SSH_FXF, cf. draft-ietf-secsh-filexfer). */
    private const SFTP_TYPE_DIRECTORY = 2;

    /**
     * Liste les sous-dossiers d'un chemin distant via SFTP. Ne retourne que les
     * dossiers (jamais les fichiers) : cet explorateur sert uniquement à choisir
     * un deploy_path, jamais à créer ou modifier des fichiers.
     */
    public function listDirectories(Server $server, string $path): array
    {
        $path = $path === '' ? '/' : $path;

        try {
            $sftp = new SFTP($server->host, $server->port, self::TIMEOUT_SECONDS);
        } catch (Throwable $e) {
            throw new RuntimeException("Impossible d'initialiser la connexion : {$e->getMessage()}");
        }

        if ($server->usesPassword()) {
            $ok = @$sftp->login($server->username, (string) $server->password);
        } else {
            try {
                $key = PublicKeyLoader::load(
                    $server->private_key,
                    $server->passphrase !== null && $server->passphrase !== '' ? $server->passphrase : false,
                );
            } catch (Throwable $e) {
                throw new RuntimeException('Clé privée invalide ou passphrase incorrecte.');
            }

            $ok = @$sftp->login($server->username, $key);
        }

        if (! $ok) {
            $lastError = $sftp->getLastSFTPError() ?: 'authentification refusée.';
            throw new RuntimeException("Connexion SFTP impossible : {$lastError}");
        }

        $list = $sftp->rawlist($path);

        if ($list === false) {
            throw new RuntimeException("Impossible de lister le dossier « {$path} ».");
        }

        $entries = [];
        foreach ($list as $name => $attributes) {
            if ($name === '.' || $name === '..') {
                continue;
            }
            if ((int) ($attributes['type'] ?? 0) !== self::SFTP_TYPE_DIRECTORY) {
                continue;
            }

            $entries[] = [
                'name' => $name,
                'path' => rtrim($path, '/').'/'.$name,
            ];
        }

        usort($entries, fn ($a, $b) => strcasecmp($a['name'], $b['name']));

        return [
            'path' => $path,
            'parent' => $path !== '/' ? (dirname($path) === '.' ? '/' : dirname($path)) : null,
            'entries' => $entries,
        ];
    }
}
