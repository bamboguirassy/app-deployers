<?php

namespace App\Services;

use App\Models\Target;
use App\Support\DirectorySymlinkGuard;
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
    public function __construct(private GitConnectionTokenResolver $tokenResolver) {}

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

        // Le token OAuth déjà obtenu via GitRepositorySection.tsx/
        // GitConnectionController pour choisir le dépôt (scope `repo`, donne
        // accès aux dépôts privés) — seul mécanisme de credential Git
        // réellement câblé côté UI aujourd'hui. Sans connexion, ne
        // fonctionne que pour un dépôt public.
        $oauthToken = $this->tokenResolver->resolve($target);
        $url = $oauthToken
            ? "https://{$oauthToken}@{$host}/{$target->repository}.git"
            : "https://{$host}/{$target->repository}.git";

        $this->run(['git', 'clone', '--branch', $branch, '--single-branch', $url, $destination]);

        if ($commitSha) {
            $this->run(['git', '-C', $destination, 'checkout', $commitSha]);
        }

        DirectorySymlinkGuard::assertNone($destination);

        return trim($this->run(['git', '-C', $destination, 'rev-parse', 'HEAD']));
    }

    private function run(array $command): string
    {
        $process = new Process($command, null, null, null, 300);
        $process->run();

        if (! $process->isSuccessful()) {
            $label = implode(' ', array_slice($command, 0, 2));

            throw new RuntimeException("Commande git échouée ({$label}) : ".trim($process->getErrorOutput()));
        }

        return $process->getOutput();
    }
}
