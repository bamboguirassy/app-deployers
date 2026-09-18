<?php

namespace App\Transports;

use App\Models\Server;
use App\Models\TargetEnvironment;
use Illuminate\Support\Facades\Cache;
use RuntimeException;
use Throwable;

/**
 * Sync fichier par fichier via l'extension native ext-ftp (fallback pour les
 * hébergements sans SFTP). Même stratégie de manifeste/diff que
 * SftpTransport — voir DeploymentManifest.
 *
 * FTP/FTPS classique n'a pas d'équivalent fiable à `rename()` garanti
 * atomique ni de notion de home directory standardisée entre serveurs :
 * les chemins distants sont construits en absolu à partir de deploy_path,
 * comme pour les autres transports.
 */
class FtpTransport implements TransportContract
{
    private const MANIFEST_FILENAME = '.deploy-manifest.json';

    public static function type(): string
    {
        return 'ftp';
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

        $output = '';
        $log = function (string $line) use (&$output, $onOutput) {
            $output .= $line."\n";

            if ($onOutput !== null) {
                $onOutput($line."\n");
            }
        };

        try {
            $connection = $this->connect($server);
        } catch (Throwable $e) {
            return new TransportSyncResult($e->getMessage(), success: false);
        }

        try {
            ftp_pasv($connection, true);

            $deployPath = rtrim($targetEnvironment->deploy_path, '/');
            $manifestPath = $deployPath.'/'.self::MANIFEST_FILENAME;

            $previous = $this->readRemoteManifest($connection, $manifestPath);
            $current = DeploymentManifest::buildFromLocalDirectory($localPath);
            $diff = DeploymentManifest::diff($previous, $current);

            $log(sprintf('%d fichier(s) à envoyer, %d à supprimer.', count($diff['uploads']), count($diff['deletions'])));

            foreach ($diff['uploads'] as $relativePath) {
                if (Cache::get($cancelKey)) {
                    return new TransportSyncResult($output, success: false, cancelled: true);
                }

                $log("↑ {$relativePath}");
                $this->uploadFile($connection, $localPath.'/'.$relativePath, $deployPath.'/'.$relativePath);
            }

            foreach ($diff['deletions'] as $relativePath) {
                if (Cache::get($cancelKey)) {
                    return new TransportSyncResult($output, success: false, cancelled: true);
                }

                $log("✕ {$relativePath}");
                @ftp_delete($connection, $deployPath.'/'.$relativePath);
            }

            $this->uploadString($connection, $manifestPath, (string) json_encode($current));

            return new TransportSyncResult($output, success: true);
        } finally {
            ftp_close($connection);
        }
    }

    /**
     * @return resource
     */
    private function connect(Server $server)
    {
        // Pas de distinction FTP/FTPS explicite dans la config du step
        // ("ftp" couvre les deux) : on tente FTPS d'abord, avec repli
        // silencieux sur FTP en clair si le serveur ne le supporte pas.
        $connection = function_exists('ftp_ssl_connect') ? @ftp_ssl_connect($server->host, $server->port ?: 21, 10) : false;
        $connection = $connection ?: @ftp_connect($server->host, $server->port ?: 21, 10);

        if (! $connection) {
            throw new RuntimeException("Connexion FTP impossible sur {$server->host}:{$server->port}.");
        }

        if (! @ftp_login($connection, $server->username, (string) $server->password)) {
            ftp_close($connection);

            throw new RuntimeException("Authentification FTP refusée pour l'utilisateur « {$server->username} ».");
        }

        return $connection;
    }

    /**
     * @param  resource  $connection
     */
    private function uploadFile($connection, string $localFile, string $remoteFile): void
    {
        $this->ensureRemoteDirectory($connection, dirname($remoteFile));

        $temporary = $remoteFile.'.uploading-'.bin2hex(random_bytes(4));

        if (! @ftp_put($connection, $temporary, $localFile, FTP_BINARY)) {
            throw new RuntimeException("Échec de l'envoi FTP de {$localFile} vers {$temporary}.");
        }

        @ftp_delete($connection, $remoteFile);

        if (! @ftp_rename($connection, $temporary, $remoteFile)) {
            throw new RuntimeException("Échec du renommage FTP de {$temporary} vers {$remoteFile}.");
        }
    }

    /**
     * @param  resource  $connection
     */
    private function uploadString($connection, string $remoteFile, string $content): void
    {
        $stream = fopen('php://temp', 'r+');
        fwrite($stream, $content);
        rewind($stream);

        ftp_fput($connection, $remoteFile, $stream, FTP_BINARY);
        fclose($stream);
    }

    /**
     * @param  resource  $connection
     */
    private function ensureRemoteDirectory($connection, string $directory): void
    {
        if ($directory === '.' || $directory === '/') {
            return;
        }

        $parts = array_filter(explode('/', $directory));
        $path = '';

        foreach ($parts as $part) {
            $path .= '/'.$part;

            // mkdir échoue silencieusement si le dossier existe déjà — c'est
            // le comportement attendu, pas une erreur à propager.
            @ftp_mkdir($connection, $path);
        }
    }

    /**
     * @param  resource  $connection
     * @return array<string, array{size: int, checksum: string}>
     */
    private function readRemoteManifest($connection, string $manifestPath): array
    {
        $stream = fopen('php://temp', 'r+');

        if (! @ftp_fget($connection, $stream, $manifestPath, FTP_BINARY)) {
            fclose($stream);

            return [];
        }

        rewind($stream);
        $content = stream_get_contents($stream);
        fclose($stream);

        $decoded = json_decode((string) $content, true);

        return is_array($decoded) ? $decoded : [];
    }
}
