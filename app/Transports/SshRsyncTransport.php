<?php

namespace App\Transports;

use App\Models\TargetEnvironment;
use Illuminate\Support\Facades\Cache;
use RuntimeException;
use Symfony\Component\Process\Process;
use Throwable;

/**
 * Seul transport de ce namespace qui shell-out vers un binaire système
 * (`rsync`/`ssh`) plutôt que d'utiliser une lib PHP pure — rsync est un
 * protocole propre à ce binaire, il n'existe pas d'implémentation PHP
 * fiable à réutiliser (contrairement à SftpTransport, qui reste en
 * phpseclib3 pur comme le reste du projet).
 */
class SshRsyncTransport implements TransportContract
{
    public static function type(): string
    {
        return 'ssh_rsync';
    }

    public function sync(
        string $localPath,
        TargetEnvironment $targetEnvironment,
        string $cancelKey,
        ?callable $onOutput = null,
    ): TransportSyncResult {
        $server = $targetEnvironment->server;

        if (! $server) {
            throw new RuntimeException('Aucun serveur configuré pour cet environnement.');
        }

        if ($server->usesSshKey() && $server->passphrase) {
            throw new RuntimeException(
                "Le transport ssh_rsync ne supporte pas les clés protégées par passphrase (pas d'agent SSH sur le runner) — utilisez une clé sans passphrase."
            );
        }

        $keyFile = null;

        try {
            $sshArgs = ['ssh', '-o', 'StrictHostKeyChecking=no', '-o', 'UserKnownHostsFile=/dev/null', '-p', (string) $server->port];

            $command = [];

            if ($server->usesSshKey()) {
                $keyFile = $this->writeTemporaryKeyFile((string) $server->private_key);
                $sshArgs[] = '-i';
                $sshArgs[] = $keyFile;
            } else {
                if (! $this->sshpassAvailable()) {
                    throw new RuntimeException(
                        "rsync par mot de passe nécessite le binaire 'sshpass', introuvable sur ce runner — configurez ce serveur avec une clé SSH sans passphrase pour le transport ssh_rsync."
                    );
                }

                $command[] = 'sshpass';
                $command[] = '-p';
                $command[] = (string) $server->password;
            }

            $destination = "{$server->username}@{$server->host}:".rtrim($targetEnvironment->deploy_path, '/').'/';

            $command = [
                ...$command,
                'rsync', '-az', '--delete',
                '-e', implode(' ', $sshArgs),
                rtrim($localPath, '/').'/',
                $destination,
            ];

            return $this->runProcess($command, $cancelKey, $onOutput);
        } finally {
            if ($keyFile) {
                @unlink($keyFile);
            }
        }
    }

    private function runProcess(array $command, string $cancelKey, ?callable $onOutput): TransportSyncResult
    {
        $process = new Process($command, null, null, null, config('deploy.sync_timeout_seconds'));

        $output = '';
        $cancelled = false;

        try {
            $process->start(function (string $type, string $buffer) use (&$output, $onOutput) {
                $output .= $buffer;

                if ($onOutput !== null) {
                    $onOutput($buffer);
                }
            });

            while ($process->isRunning()) {
                if (Cache::get($cancelKey)) {
                    $process->stop(3, \SIGTERM);
                    $cancelled = true;
                    break;
                }
                usleep(250_000);
            }

            $exitCode = $process->wait();
        } catch (Throwable $e) {
            $output .= "\n".$e->getMessage();
            $exitCode = 1;
        }

        return new TransportSyncResult($output, $exitCode === 0, $cancelled);
    }

    private function writeTemporaryKeyFile(string $privateKey): string
    {
        $path = tempnam(sys_get_temp_dir(), 'deploy_rsync_key_');
        file_put_contents($path, rtrim($privateKey)."\n");
        chmod($path, 0600);

        return $path;
    }

    private function sshpassAvailable(): bool
    {
        $process = Process::fromShellCommandline('command -v sshpass');
        $process->run();

        return $process->isSuccessful();
    }
}
