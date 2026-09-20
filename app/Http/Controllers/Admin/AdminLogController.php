<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminLogController extends Controller
{
    private const PER_PAGE = 15;

    /**
     * Au-delà de cette taille, on ne lit que la fin du fichier (tail) plutôt
     * que tout son contenu — les fichiers `laravel-*.log` en rotation daily
     * peuvent grossir sur une journée chargée et un file() complet finirait
     * par charger plusieurs dizaines de Mo en mémoire à chaque requête.
     */
    private const TAIL_BYTES_THRESHOLD = 20 * 1024 * 1024;

    public function index(Request $request): Response
    {
        $this->authorize('platform-admin.access');

        $files = $this->availableFiles();
        $selectedFile = $request->string('file')->toString();

        if (! in_array($selectedFile, array_column($files, 'value'), true)) {
            $selectedFile = $files[0]['value'] ?? null;
        }

        return Inertia::render('Admin/Logs', [
            'files' => $files,
            'selectedFile' => $selectedFile,
            'entries' => $selectedFile
                ? $this->paginatedEntries($selectedFile, $request)
                : ['data' => [], 'next_page_url' => null],
            'filters' => $request->only(['level', 'search']),
        ]);
    }

    private function availableFiles(): array
    {
        $paths = glob(storage_path('logs/laravel-*.log')) ?: [];
        rsort($paths);

        return collect($paths)
            ->map(fn (string $path) => [
                'value' => basename($path),
                'label' => basename($path),
            ])
            ->values()
            ->all();
    }

    private function paginatedEntries(string $file, Request $request): array
    {
        // Le fichier n'est jamais construit à partir d'un chemin fourni par la
        // requête : on ne retient que le basename, vérifié contre la liste des
        // fichiers réellement présents dans storage/logs — impossible de sortir
        // de ce répertoire via `file=../../.env` ou équivalent.
        $allowed = array_column($this->availableFiles(), 'value');

        abort_unless(in_array($file, $allowed, true), 404);

        $path = storage_path('logs/'.$file);
        $level = strtoupper($request->string('level')->toString());
        $search = $request->string('search')->toString();
        $page = max(1, $request->integer('page', 1));

        $entries = array_reverse($this->parseEntries($path));

        if ($level !== '') {
            $entries = array_values(array_filter(
                $entries,
                fn (array $entry) => $entry['level'] === $level,
            ));
        }

        if ($search !== '') {
            $needle = mb_strtolower($search);
            $entries = array_values(array_filter(
                $entries,
                fn (array $entry) => str_contains(mb_strtolower($entry['message']), $needle),
            ));
        }

        $total = count($entries);
        $offset = ($page - 1) * self::PER_PAGE;
        $data = array_slice($entries, $offset, self::PER_PAGE);
        $hasMore = ($offset + self::PER_PAGE) < $total;

        return [
            'data' => $data,
            'next_page_url' => $hasMore
                ? route('admin.logs', array_filter([
                    'file' => $file,
                    'level' => $level ?: null,
                    'search' => $search ?: null,
                    'page' => $page + 1,
                ]))
                : null,
        ];
    }

    private function parseEntries(string $path): array
    {
        if (! is_file($path)) {
            return [];
        }

        $content = filesize($path) > self::TAIL_BYTES_THRESHOLD
            ? $this->tail($path, self::TAIL_BYTES_THRESHOLD)
            : file_get_contents($path);

        $lines = explode("\n", (string) $content);
        $entries = [];
        $current = null;

        foreach ($lines as $line) {
            if (preg_match('/^\[(?<ts>[^\]]+)\] (?<env>[\w-]+)\.(?<level>\w+): (?<message>.*)$/', $line, $m)) {
                if ($current !== null) {
                    $entries[] = $current;
                }

                $current = [
                    'id' => $m['ts'].'-'.count($entries),
                    'timestamp' => $m['ts'],
                    'env' => $m['env'],
                    'level' => strtoupper($m['level']),
                    'message' => $m['message'],
                ];
            } elseif ($current !== null && $line !== '') {
                $current['message'] .= "\n".$line;
            }
        }

        if ($current !== null) {
            $entries[] = $current;
        }

        return $entries;
    }

    private function tail(string $path, int $bytes): string
    {
        $size = filesize($path);
        $handle = fopen($path, 'r');
        fseek($handle, max(0, $size - $bytes));
        $content = stream_get_contents($handle);
        fclose($handle);

        // La lecture démarre potentiellement au milieu d'une entrée : on
        // écarte la première ligne partielle pour ne pas la mêler à la
        // dernière entrée complète précédente.
        $firstNewline = strpos($content, "\n");

        return $firstNewline !== false ? substr($content, $firstNewline + 1) : $content;
    }
}
