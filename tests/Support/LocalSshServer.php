<?php

namespace Tests\Support;

use Symfony\Component\Process\Process;

/**
 * Démarre un vrai sshd éphémère sur 127.0.0.1, pour des tests d'intégration
 * réels des transports ssh_rsync/sftp sans dépendre d'un serveur externe.
 * Se dégrade en skip (pas en échec) si l'environnement ne fournit pas les
 * binaires nécessaires ou refuse de démarrer sshd sans privilèges.
 */
class LocalSshServer
{
    public readonly int $port;
    public readonly string $privateKeyPath;
    public readonly string $privateKey;
    public readonly string $username;
    public readonly string $rootDir;

    private ?Process $process = null;
    private string $workDir;

    public static function bootOrSkip(): self
    {
        $server = new self();
        $server->boot();

        return $server;
    }

    private function __construct()
    {
        $this->port = random_int(20000, 40000);
        $this->username = (string) (posix_getpwuid(posix_geteuid())['name'] ?? get_current_user());
        $this->workDir = sys_get_temp_dir().'/local_sshd_'.bin2hex(random_bytes(6));
        $this->rootDir = $this->workDir.'/root';
        $this->privateKeyPath = $this->workDir.'/id_ed25519';
        mkdir($this->rootDir, 0777, true);
    }

    private function boot(): void
    {
        $sshdPath = trim((string) shell_exec('command -v sshd'));
        $sftpServerPath = $this->findSftpServer();

        if ($sshdPath === '' || $sftpServerPath === null) {
            \PHPUnit\Framework\Assert::markTestSkipped('sshd ou sftp-server introuvable sur ce runner — test d\'intégration ignoré.');
        }

        $keygen = Process::fromShellCommandline(
            'ssh-keygen -t ed25519 -N "" -f '.escapeshellarg($this->privateKeyPath).' -q'
        );
        $keygen->run();

        $hostKeyPath = $this->workDir.'/host_key';
        $hostKeygen = Process::fromShellCommandline(
            'ssh-keygen -t ed25519 -N "" -f '.escapeshellarg($hostKeyPath).' -q'
        );
        $hostKeygen->run();

        if (! $keygen->isSuccessful() || ! $hostKeygen->isSuccessful()) {
            \PHPUnit\Framework\Assert::markTestSkipped('ssh-keygen a échoué — test d\'intégration ignoré.');
        }

        $authorizedKeysPath = $this->workDir.'/authorized_keys';
        copy($this->privateKeyPath.'.pub', $authorizedKeysPath);
        chmod($authorizedKeysPath, 0600);
        chmod($this->privateKeyPath, 0600);

        $this->privateKey = file_get_contents($this->privateKeyPath);

        $configPath = $this->workDir.'/sshd_config';
        file_put_contents($configPath, implode("\n", [
            'Port '.$this->port,
            'ListenAddress 127.0.0.1',
            'HostKey '.$hostKeyPath,
            'AuthorizedKeysFile '.$authorizedKeysPath,
            'PubkeyAuthentication yes',
            'PasswordAuthentication no',
            'UsePAM no',
            'StrictModes no',
            'Subsystem sftp '.$sftpServerPath,
            'PidFile '.$this->workDir.'/sshd.pid',
            'LogLevel QUIET',
        ])."\n");

        $this->process = new Process([$sshdPath, '-f', $configPath, '-D', '-e']);
        $this->process->start();

        $connected = false;

        for ($i = 0; $i < 40; $i++) {
            usleep(100_000);

            if (! $this->process->isRunning()) {
                break;
            }

            $probe = @fsockopen('127.0.0.1', $this->port, $errno, $errstr, 0.2);

            if ($probe) {
                fclose($probe);
                $connected = true;
                break;
            }
        }

        if (! $connected) {
            $errorOutput = $this->process->getErrorOutput();
            $this->stop();
            \PHPUnit\Framework\Assert::markTestSkipped("Impossible de démarrer sshd localement pour le test d'intégration : {$errorOutput}");
        }
    }

    private function findSftpServer(): ?string
    {
        foreach (['/usr/libexec/sftp-server', '/usr/lib/openssh/sftp-server', '/usr/lib/ssh/sftp-server'] as $candidate) {
            if (is_executable($candidate)) {
                return $candidate;
            }
        }

        return null;
    }

    public function stop(): void
    {
        $this->process?->stop(3, \SIGTERM);
    }
}
