<?php

namespace App\Services;

use phpseclib3\Crypt\PublicKeyLoader;
use phpseclib3\Net\SSH2;
use Throwable;

class SshConnectionTester
{
    private const TIMEOUT_SECONDS = 10;

    /**
     * Tente une connexion + authentification SSH réelle avec les identifiants
     * fournis, sans rien persister. Toujours retourne un résultat (jamais
     * d'exception non gérée) pour rester simple à consommer côté contrôleur.
     */
    public function test(
        string $host,
        int $port,
        string $username,
        string $authMethod,
        ?string $password,
        ?string $privateKey,
        ?string $passphrase,
    ): array {
        $start = microtime(true);

        try {
            $ssh = new SSH2($host, $port, self::TIMEOUT_SECONDS);
        } catch (Throwable $e) {
            return $this->failure("Impossible d'initialiser la connexion : {$e->getMessage()}");
        }

        try {
            if ($authMethod === 'password') {
                $ok = @$ssh->login($username, (string) $password);
            } else {
                try {
                    $key = PublicKeyLoader::load($privateKey, $passphrase !== null && $passphrase !== '' ? $passphrase : false);
                } catch (Throwable $e) {
                    return $this->failure('Clé privée invalide ou passphrase incorrecte.');
                }

                $ok = @$ssh->login($username, $key);
            }
        } catch (Throwable $e) {
            return $this->failure($this->friendlyError($ssh, $e));
        }

        $latencyMs = (int) round((microtime(true) - $start) * 1000);

        if (! $ssh->isConnected()) {
            return $this->failure($this->friendlyError($ssh));
        }

        if (! $ok) {
            return $this->failure("Connexion établie, mais authentification refusée pour l'utilisateur « {$username} ».", $latencyMs);
        }

        return [
            'success' => true,
            'message' => 'Connexion et authentification réussies.',
            'latency_ms' => $latencyMs,
        ];
    }

    private function failure(string $message, ?int $latencyMs = null): array
    {
        return ['success' => false, 'message' => $message, 'latency_ms' => $latencyMs];
    }

    private function friendlyError(SSH2 $ssh, ?Throwable $e = null): string
    {
        $lastError = method_exists($ssh, 'getLastError') ? $ssh->getLastError() : null;

        if ($lastError) {
            return "Échec de connexion : {$lastError}";
        }

        if ($e) {
            return "Échec de connexion : {$e->getMessage()}";
        }

        return 'Échec de connexion : hôte injoignable ou port fermé.';
    }
}
