<?php

namespace App\Services;

use App\Models\Target;
use RuntimeException;
use Symfony\Component\Process\Process;

/**
 * Clone un dépôt Git dans un workspace local pour le build centralisé
 * (App\Jobs\RunDeploymentJob) — sans rapport avec les accès déjà présents
 * sur le serveur cible pour le mode on_target (jamais gérés par l'app).
 * Utilise le binaire `git` via Process, comme SshRsyncTransport pour rsync :
 * pas de lib PHP pure fiable pour ça.
 */
class GitCloner
{
    private const HOSTS = [
        'github' => 'github.com',
        'gitlab' => 'gitlab.com',
        'bitbucket' => 'bitbucket.org',
    ];

    /**
     * Clone $target->repository dans $destination, checkout $branch puis
     * $commitSha si fourni, et retourne le SHA réellement checkouté.
     *
     * Clone complet (pas de --depth) : un checkout vers un $commitSha
     * arbitraire (ex. rollback futur) pourrait ne pas être présent dans un
     * clone superficiel.
     */
    public function clone(Target $target, string $branch, string $destination, ?string $commitSha = null): string
    {
        if (! $target->repository || ! $target->repository_provider) {
            throw new RuntimeException('Aucun dépôt Git connecté sur ce target.');
        }

        $host = self::HOSTS[$target->repository_provider] ?? null;

        if (! $host) {
            throw new RuntimeException("Provider Git non supporté pour le clone centralisé : {$target->repository_provider}.");
        }

        $keyFile = null;
        $env = [];

        try {
            if ($target->git_credential_type === 'ssh_key') {
                $keyFile = $this->writeTemporaryKeyFile((string) $target->git_credential_secret);
                $url = "git@{$host}:{$target->repository}.git";
                $env['GIT_SSH_COMMAND'] = "ssh -i {$keyFile} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null";
            } elseif ($target->git_credential_type === 'token') {
                // Convention GitHub (token en tant que "username" HTTPS) —
                // GitLab/Bitbucket acceptent des conventions légèrement
                // différentes (oauth2:/x-token-auth:) non distinguées ici.
                $url = "https://{$target->git_credential_secret}@{$host}/{$target->repository}.git";
            } else {
                // Aucune credential configurée : ne fonctionne que pour un
                // dépôt public.
                $url = "https://{$host}/{$target->repository}.git";
            }

            $this->run(['git', 'clone', '--branch', $branch, '--single-branch', $url, $destination], $env);

            if ($commitSha) {
                $this->run(['git', '-C', $destination, 'checkout', $commitSha], $env);
            }

            return trim($this->run(['git', '-C', $destination, 'rev-parse', 'HEAD'], $env));
        } finally {
            if ($keyFile) {
                @unlink($keyFile);
            }
        }
    }

    private function run(array $command, array $env): string
    {
        $process = new Process($command, null, $env ?: null, null, 300);
        $process->run();

        if (! $process->isSuccessful()) {
            $label = implode(' ', array_slice($command, 0, 2));

            throw new RuntimeException("Commande git échouée ({$label}) : ".trim($process->getErrorOutput()));
        }

        return $process->getOutput();
    }

    private function writeTemporaryKeyFile(string $privateKey): string
    {
        $path = tempnam(sys_get_temp_dir(), 'deploy_git_key_');
        file_put_contents($path, rtrim($privateKey)."\n");
        chmod($path, 0600);

        return $path;
    }
}
