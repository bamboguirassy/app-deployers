<?php

namespace App\Services;

use App\Models\Server;
use App\Models\ServerCredential;
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
        return $this->open(
            fn () => new SSH2($server->host, $server->port, $timeoutSeconds),
            $server->host,
            $server->port,
            $server->username,
            $server->usesPassword() ? $server->password : null,
            $server->usesSshKey() ? $server->private_key : null,
            $server->passphrase,
        );
    }

    /**
     * Même authentification que connect(), mais pour le transport `sftp`
     * (App\Transports\SftpTransport) — phpseclib3\Net\SFTP étend SSH2, donc
     * la logique de login est strictement identique.
     */
    public function connectSftp(Server $server, int $timeoutSeconds = 10): SFTP
    {
        return $this->open(
            fn () => new SFTP($server->host, $server->port, $timeoutSeconds),
            $server->host,
            $server->port,
            $server->username,
            $server->usesPassword() ? $server->password : null,
            $server->usesSshKey() ? $server->private_key : null,
            $server->passphrase,
        );
    }

    /**
     * Variante de connectSftp() pour un compte SFTP dédié (ServerCredential)
     * plutôt que le SSH principal du serveur — même hôte/port, identifiants
     * distincts. Voir TargetEnvironment::sftpCredential().
     */
    public function connectSftpWithCredential(Server $server, ServerCredential $credential, int $timeoutSeconds = 10): SFTP
    {
        return $this->open(
            fn () => new SFTP($server->host, $server->port, $timeoutSeconds),
            $server->host,
            $server->port,
            $credential->username,
            $credential->password,
            $credential->private_key,
            $credential->passphrase,
        );
    }

    /**
     * @template T of SSH2
     * @param  callable(): T  $factory
     * @return T
     */
    private function open(
        callable $factory,
        string $host,
        int $port,
        string $username,
        ?string $password,
        ?string $privateKey,
        ?string $passphrase,
    ): SSH2 {
        try {
            $ssh = $factory();
        } catch (Throwable $e) {
            throw new RuntimeException("Impossible d'initialiser la connexion SSH : {$e->getMessage()}");
        }

        if ($privateKey !== null) {
            try {
                $key = PublicKeyLoader::load(
                    $privateKey,
                    $passphrase !== null && $passphrase !== '' ? $passphrase : false,
                );
            } catch (Throwable $e) {
                throw new RuntimeException('Clé privée invalide ou passphrase incorrecte.');
            }

            $ok = @$ssh->login($username, $key);
        } else {
            $ok = @$ssh->login($username, (string) $password);
        }

        if (! $ok || ! $ssh->isConnected()) {
            $lastError = $ssh->getLastError() ?: "authentification refusée pour l'utilisateur « {$username} ».";

            throw new RuntimeException("Connexion SSH impossible sur {$host}:{$port} : {$lastError}");
        }

        return $ssh;
    }
}
