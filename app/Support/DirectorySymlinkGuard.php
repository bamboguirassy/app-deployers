<?php

namespace App\Support;

use FilesystemIterator;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use RuntimeException;

/**
 * Refuse tout dossier contenant un lien symbolique, quelle que soit sa
 * cible. Utilisé par App\Services\GitCloner juste après un clone : un
 * dépôt Git peut committer des symlinks comme des fichiers normaux, et un
 * dépôt malveillant pourrait en committer un pointant hors du workspace
 * (ex. vers un secret de l'infra d'App Deployer) — lu puis transmis sans le
 * vouloir par un step `sync` ultérieur (App\StepActions\SyncStepAction).
 * On préfère échouer bruyamment ici plutôt que de tenter de résoudre/filtrer
 * les cibles cas par cas.
 */
class DirectorySymlinkGuard
{
    public static function assertNone(string $path): void
    {
        if (! is_dir($path)) {
            return;
        }

        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($path, FilesystemIterator::SKIP_DOTS),
            RecursiveIteratorIterator::SELF_FIRST,
        );

        foreach ($iterator as $file) {
            if ($file->isLink()) {
                $relative = ltrim(substr($file->getPathname(), strlen(rtrim($path, '/'))), '/');

                throw new RuntimeException(
                    "Le dépôt contient un lien symbolique ({$relative}) — refusé pour des raisons de sécurité."
                );
            }
        }
    }
}
