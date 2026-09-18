<?php

namespace App\Transports;

use FilesystemIterator;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;

/**
 * Manifeste des fichiers déjà déployés (taille + checksum), utilisé par
 * SftpTransport/FtpTransport pour calculer un diff plutôt que de retransférer
 * l'intégralité du build à chaque déploiement. Logique volontairement pure
 * (aucun accès réseau) pour rester testable sans serveur cible.
 */
class DeploymentManifest
{
    /**
     * @return array<string, array{size: int, checksum: string}>
     */
    public static function buildFromLocalDirectory(string $path): array
    {
        $manifest = [];

        if (! is_dir($path)) {
            return $manifest;
        }

        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($path, FilesystemIterator::SKIP_DOTS),
            RecursiveIteratorIterator::SELF_FIRST,
        );

        foreach ($iterator as $file) {
            if ($file->isDir()) {
                continue;
            }

            $relative = ltrim(substr($file->getPathname(), strlen(rtrim($path, '/'))), '/');

            $manifest[$relative] = [
                'size' => $file->getSize(),
                'checksum' => (string) hash_file('crc32b', $file->getPathname()),
            ];
        }

        ksort($manifest);

        return $manifest;
    }

    /**
     * @param  array<string, array{size: int, checksum: string}>  $previous
     * @param  array<string, array{size: int, checksum: string}>  $current
     * @return array{uploads: string[], deletions: string[]}
     */
    public static function diff(array $previous, array $current): array
    {
        $uploads = [];

        foreach ($current as $relativePath => $meta) {
            $prior = $previous[$relativePath] ?? null;

            if (! $prior || $prior['size'] !== $meta['size'] || $prior['checksum'] !== $meta['checksum']) {
                $uploads[] = $relativePath;
            }
        }

        $deletions = array_values(array_diff(array_keys($previous), array_keys($current)));

        return ['uploads' => $uploads, 'deletions' => $deletions];
    }
}
