<?php

namespace App\Transports;

use App\Models\TargetEnvironment;
use App\Services\SshAuthenticator;
use Illuminate\Support\Facades\Cache;
use phpseclib3\Net\SFTP;
use RuntimeException;
use Throwable;

/**
 * Sync fichier par fichier via SFTP, pur phpseclib3 (cohérent avec
 * SshAuthenticator/CommandStepAction) — aucune exécution distante requise,
 * contrairement à ssh_rsync. Le diff s'appuie sur un manifeste JSON caché
 * déposé dans deploy_path (voir DeploymentManifest), reconstruit à chaque
 * synchronisation plutôt que de faire un stat() par fichier distant.
 */
class SftpTransport implements TransportContract
{
    private const MANIFEST_FILENAME = '.deploy-manifest.json';

    public function __construct(private SshAuthenticator $authenticator) {}

    public static function type(): string
    {
        return 'sftp';
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
            $sftp = $this->authenticator->connectSftp($server);
        } catch (Throwable $e) {
            return new TransportSyncResult($e->getMessage(), success: false);
        }

        $deployPath = rtrim($targetEnvironment->deploy_path, '/');
        $manifestPath = $deployPath.'/'.self::MANIFEST_FILENAME;

        $previous = $this->readRemoteManifest($sftp, $manifestPath);
        $current = DeploymentManifest::buildFromLocalDirectory($localPath);
        $diff = DeploymentManifest::diff($previous, $current);

        $log(sprintf('%d fichier(s) à envoyer, %d à supprimer.', count($diff['uploads']), count($diff['deletions'])));

        foreach ($diff['uploads'] as $relativePath) {
            if (Cache::get($cancelKey)) {
                return new TransportSyncResult($output, success: false, cancelled: true);
            }

            $log("↑ {$relativePath}");
            $this->uploadFile($sftp, $localPath.'/'.$relativePath, $deployPath.'/'.$relativePath);
        }

        foreach ($diff['deletions'] as $relativePath) {
            if (Cache::get($cancelKey)) {
                return new TransportSyncResult($output, success: false, cancelled: true);
            }

            $log("✕ {$relativePath}");
            $sftp->delete($deployPath.'/'.$relativePath);
        }

        $sftp->put($manifestPath, (string) json_encode($current));

        return new TransportSyncResult($output, success: true);
    }

    private function uploadFile(SFTP $sftp, string $localFile, string $remoteFile): void
    {
        $directory = dirname($remoteFile);

        if ($directory !== '.' && ! $sftp->is_dir($directory)) {
            $sftp->mkdir($directory, -1, true);
        }

        $temporary = $remoteFile.'.uploading-'.bin2hex(random_bytes(4));

        if (! $sftp->put($temporary, $localFile, SFTP::SOURCE_LOCAL_FILE)) {
            throw new RuntimeException("Échec de l'envoi SFTP de {$localFile} vers {$temporary}.");
        }

        // La spec SFTP n'exige pas qu'un rename écrase la cible existante
        // (contrairement à POSIX rename()) — on supprime explicitement
        // l'ancien fichier avant de renommer, plutôt que de compter sur un
        // comportement d'écrasement non garanti côté serveur.
        if ($sftp->file_exists($remoteFile)) {
            $sftp->delete($remoteFile);
        }

        $sftp->rename($temporary, $remoteFile);
    }

    /**
     * @return array<string, array{size: int, checksum: string}>
     */
    private function readRemoteManifest(SFTP $sftp, string $manifestPath): array
    {
        if (! $sftp->file_exists($manifestPath)) {
            return [];
        }

        $content = $sftp->get($manifestPath);

        if (! is_string($content)) {
            return [];
        }

        $decoded = json_decode($content, true);

        return is_array($decoded) ? $decoded : [];
    }
}
