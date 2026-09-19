<?php

namespace App\Console\Commands;

use App\Models\Application;
use App\Models\Environment;
use App\Models\PipelineStep;
use App\Models\Plan;
use App\Models\Server;
use App\Models\Target;
use App\Models\TargetEnvironment;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\PermissionRegistrar;
use Symfony\Component\Process\Process;

/**
 * Crée une application de démonstration réelle (pas un test automatisé) avec
 * un pipeline complet : clone Git, commande SSH sur un vrai serveur local
 * (un sshd démarré exprès, détaché, conservé en vie après la commande), et
 * synchronisation SFTP vers un vrai dossier sur disque — pour pouvoir
 * cliquer "Déployer" dans l'interface et observer le résultat.
 *
 * Idempotent : supprime puis recrée le workspace de démo à chaque exécution.
 * N'affecte jamais les workspaces existants (créés séparément, nommés
 * explicitement "Démo Pipeline").
 */
#[Signature('demo:centralized-pipeline')]
#[Description('Crée une application de démo avec un pipeline clone + SSH + SFTP, et démarre un vrai sshd local dédié')]
class CreateDemoPipelineApp extends Command
{
    public function handle(): int
    {
        $demoDir = storage_path('app/demo-pipeline');
        File::deleteDirectory($demoDir);
        File::ensureDirectoryExists($demoDir.'/ssh');
        File::ensureDirectoryExists($demoDir.'/deploy-target');

        Workspace::where('slug', 'demo-pipeline')->first()?->delete();

        $sshdInfo = $this->startPersistentSshd($demoDir.'/ssh');

        if (! $sshdInfo) {
            $this->error('Impossible de démarrer le sshd de démo (sshd/ssh-keygen introuvable, ou déjà en échec). Abandon.');

            return self::FAILURE;
        }

        [$port, $privateKey, $rootDir] = $sshdInfo;

        $user = User::factory()->create([
            'name' => 'Démo Pipeline',
            'email' => 'demo-pipeline@example.test',
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
        ]);

        $workspace = Workspace::create(['name' => 'Démo Pipeline', 'slug' => 'demo-pipeline']);
        $workspace->subscription()->create(['plan_id' => Plan::free()->id, 'status' => 'active']);

        app(PermissionRegistrar::class)->setPermissionsTeamId($workspace->id);
        $user->assignRole('owner');

        $application = Application::create([
            'workspace_id' => $workspace->id,
            'name' => 'Démo Pipeline Complet',
            'created_by' => $user->id,
        ]);

        $target = Target::create([
            'application_id' => $application->id,
            'name' => 'API',
            'slug' => 'api',
            'repository' => 'octocat/Hello-World',
            'repository_provider' => 'github',
        ]);

        $environment = Environment::create([
            'application_id' => $application->id,
            'name' => 'Prod',
            'slug' => 'prod',
        ]);

        $server = Server::create([
            'workspace_id' => $workspace->id,
            'name' => 'Demo Local SSH',
            'host' => '127.0.0.1',
            'port' => $port,
            'username' => (string) (posix_getpwuid(posix_geteuid())['name'] ?? get_current_user()),
            'auth_method' => 'ssh_key',
            'private_key' => $privateKey,
            'created_by' => $user->id,
        ]);

        $deployPath = $demoDir.'/deploy-target';

        $targetEnvironment = TargetEnvironment::create([
            'target_id' => $target->id,
            'environment_id' => $environment->id,
            'server_id' => $server->id,
            'deploy_path' => $deployPath,
            'git_branch' => 'master',
        ]);

        PipelineStep::create([
            'target_id' => $target->id,
            'label' => 'Cloner le dépôt',
            'type' => 'clone',
            'config' => [],
            'order' => 0,
        ]);

        PipelineStep::create([
            'target_id' => $target->id,
            'label' => 'Commande post-déploiement (SSH)',
            'type' => 'command',
            'config' => ['command' => 'echo "deploye via ssh a $(date)" > DEPLOYED_VIA_SSH.txt'],
            'order' => 1,
        ]);

        PipelineStep::create([
            'target_id' => $target->id,
            'label' => 'Livrer par SFTP',
            'type' => 'sync',
            'config' => ['transport' => 'sftp', 'local_path' => '', 'remote_path' => ''],
            'order' => 2,
        ]);

        $this->info('Application de démo créée.');
        $this->line('');
        $this->line("Workspace : {$workspace->slug}  |  Application : {$application->slug}  |  Target : {$target->slug}");
        $this->line("Connexion : demo-pipeline@example.test / password");
        $this->line("URL locale : http://localhost:8010/w/{$workspace->slug}/applications/{$application->slug}");
        $this->line('');
        $this->line("Serveur SSH de démo : 127.0.0.1:{$port} (sshd détaché, PID dans {$demoDir}/ssh/sshd.pid)");
        $this->line("Dossier de déploiement réel (à inspecter après le déploiement) : {$deployPath}");
        $this->line('');
        $this->line("Pour arrêter le sshd de démo : kill \$(cat {$demoDir}/ssh/sshd.pid)");

        return self::SUCCESS;
    }

    /**
     * @return array{0: int, 1: string, 2: string}|null [port, privateKey, rootDir]
     */
    private function startPersistentSshd(string $workDir): ?array
    {
        $sshdPath = trim((string) shell_exec('command -v sshd'));
        $sftpServerPath = $this->findSftpServer();

        if ($sshdPath === '' || $sftpServerPath === null) {
            return null;
        }

        $privateKeyPath = $workDir.'/id_ed25519';
        $hostKeyPath = $workDir.'/host_key';

        $keygen = Process::fromShellCommandline('ssh-keygen -t ed25519 -N "" -f '.escapeshellarg($privateKeyPath).' -q');
        $keygen->run();
        $hostKeygen = Process::fromShellCommandline('ssh-keygen -t ed25519 -N "" -f '.escapeshellarg($hostKeyPath).' -q');
        $hostKeygen->run();

        if (! $keygen->isSuccessful() || ! $hostKeygen->isSuccessful()) {
            return null;
        }

        $authorizedKeysPath = $workDir.'/authorized_keys';
        copy($privateKeyPath.'.pub', $authorizedKeysPath);
        chmod($authorizedKeysPath, 0600);
        chmod($privateKeyPath, 0600);

        $port = random_int(20000, 40000);
        $pidFile = $workDir.'/sshd.pid';
        $logFile = $workDir.'/sshd.log';

        $configPath = $workDir.'/sshd_config';
        file_put_contents($configPath, implode("\n", [
            'Port '.$port,
            'ListenAddress 127.0.0.1',
            'HostKey '.$hostKeyPath,
            'AuthorizedKeysFile '.$authorizedKeysPath,
            'PubkeyAuthentication yes',
            'PasswordAuthentication no',
            'UsePAM no',
            'StrictModes no',
            'Subsystem sftp '.$sftpServerPath,
            'PidFile '.$pidFile,
            'LogLevel QUIET',
        ])."\n");

        // Détaché (pas de -D) : ce process daemonise lui-même et survit à la
        // fin de cette commande Artisan — contrairement aux tests, cette
        // démo doit rester utilisable après coup depuis le navigateur.
        $process = Process::fromShellCommandline(
            escapeshellarg($sshdPath).' -f '.escapeshellarg($configPath).' -E '.escapeshellarg($logFile)
        );
        $process->run();

        if (! $process->isSuccessful()) {
            $this->error('sshd: '.trim(@file_get_contents($logFile) ?: $process->getErrorOutput()));

            return null;
        }

        for ($i = 0; $i < 30; $i++) {
            $probe = @fsockopen('127.0.0.1', $port, $errno, $errstr, 0.2);
            if ($probe) {
                fclose($probe);

                return [$port, file_get_contents($privateKeyPath), $workDir];
            }
            usleep(100_000);
        }

        return null;
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
}
