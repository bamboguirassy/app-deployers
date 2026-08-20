<?php

namespace App\Services;

use RuntimeException;

class LocalDirectoryBrowser
{
    private const EXCLUDED = ['proc', 'sys', 'dev', 'run', 'snap'];

    public function listDirectories(string $path): array
    {
        $root = rtrim((string) config('deploy.local_browse_root'), '/') ?: '/';
        $path = $path === '' ? $root : $path;
        $realPath = realpath($path);

        if ($realPath === false || ! is_dir($realPath)) {
            throw new RuntimeException("Le dossier « {$path} » n'existe pas ou n'est pas accessible.");
        }

        if (! str_starts_with($realPath . '/', $root . '/') && $realPath !== $root) {
            throw new RuntimeException("Accès interdit en dehors de « {$root} ».");
        }

        $items = @scandir($realPath);

        if ($items === false) {
            throw new RuntimeException("Impossible de lister le dossier « {$path} ».");
        }

        $entries = [];
        foreach ($items as $name) {
            if ($name === '.' || $name === '..') {
                continue;
            }

            if ($realPath === '/' && in_array($name, self::EXCLUDED, true)) {
                continue;
            }

            $fullPath = rtrim($realPath, '/') . '/' . $name;

            if (! is_dir($fullPath)) {
                continue;
            }

            $entries[] = [
                'name' => $name,
                'path' => $fullPath,
            ];
        }

        usort($entries, fn ($a, $b) => strcasecmp($a['name'], $b['name']));

        $parent = null;
        if ($realPath !== '/' && $realPath !== $root) {
            $parentPath = dirname($realPath);
            $parent = $parentPath === '.' ? '/' : $parentPath;
        }

        return [
            'path' => $realPath,
            'parent' => $parent,
            'entries' => $entries,
        ];
    }
}
