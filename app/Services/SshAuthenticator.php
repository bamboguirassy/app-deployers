<?php

namespace App\Services;

use App\Models\Server;
use phpseclib3\Crypt\PublicKeyLoader;
use phpseclib3\Net\SFTP;
use phpseclib3\Net\SSH2;
use RuntimeException;
use Throwable;

class SshAuthenticator
{
    /**
     * Ouvre une connexion SSH authentifiée vers ce serveur. Lève une exception
     * explicite en cas d'échec (hôte injoignable, identifiants refusés, clé
     * invalide) plutôt que de retourner un objet dans un état indéterminé.
     */
    public function connect(Server $server, int $timeoutSeconds = 10): SSH2
    {
        return $this->open(fn () => new SSH2($server->host, $server->port, $timeoutSeconds), $server);
    }

    /**
     * Même authentification que connect(), mais pour le transport `sftp`
     * (App\Transports\SftpTransport) — phpseclib3\Net\SFTP étend SSH2, donc
     * la logique de login est strictement identique.
     */
    public function connectSftp(Server $server, int $timeoutSeconds = 10): SFTP
    {
        return $this->open(fn () => new SFTP($server->host, $server->port, $timeoutSeconds), $server);
    }

    /**
     * @template T of SSH2
     * @param  callable(): T  $factory
     * @return T
     */
    private function open(callable $factory, Server $server): SSH2
    {
        try {
            $ssh = $factory();
        } catch (Throwable $e) {
            throw new RuntimeException("Impossible d'initialiser la connexion SSH : {$e->getMessage()}");
        }

        if ($server->usesPassword()) {
            $ok = @$ssh->login($server->username, (string) $server->password);
        } else {
            try {
                $key = PublicKeyLoader::load(
                    $server->private_key,
                    $server->passphrase !== null && $server->passphrase !== '' ? $server->passphrase : false,
                );
            } catch (Throwable $e) {
                throw new RuntimeException('Clé privée invalide ou passphrase incorrecte.');
            }

            $ok = @$ssh->login($server->username, $key);
        }

        if (! $ok || ! $ssh->isConnected()) {
            $lastError = $ssh->getLastError() ?: "authentification refusée pour l'utilisateur « {$server->username} ».";

            throw new RuntimeException("Connexion SSH impossible sur {$server->host}:{$server->port} : {$lastError}");
        }

        return $ssh;
    }
}
