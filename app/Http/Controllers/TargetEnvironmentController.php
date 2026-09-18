<?php

namespace App\Http\Controllers;

use App\Models\Application;
use App\Models\Environment;
use App\Models\Server;
use App\Models\Target;
use App\Models\TargetEnvironment;
use App\Models\Workspace;
use App\Support\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class TargetEnvironmentController extends Controller
{
    public function store(Request $request, Workspace $workspace, Application $application, Target $target, Environment $environment): RedirectResponse
    {
        $this->authorize('manageEnvironments', $application);
        abort_unless(
            $target->belongsToWorkspace($workspace) && $environment->belongsToWorkspace($workspace),
            404
        );

        $data = $this->validated($request, $workspace);

        $targetEnvironment = TargetEnvironment::create([
            'target_id' => $target->id,
            'environment_id' => $environment->id,
            ...$data,
        ]);

        AuditLogger::log($application, 'target_environment.created', $targetEnvironment, $data);

        return back()->with('status', 'Configuration liée.');
    }

    public function update(Request $request, Workspace $workspace, Application $application, TargetEnvironment $targetEnvironment): RedirectResponse
    {
        $this->authorize('manageEnvironments', $application);
        abort_unless($targetEnvironment->belongsToWorkspace($workspace), 404);

        $data = $this->validated($request, $workspace);

        $targetEnvironment->update($data);

        AuditLogger::log($application, 'target_environment.updated', $targetEnvironment, $data);

        return back()->with('status', 'Configuration mise à jour.');
    }

    private function validated(Request $request, Workspace $workspace): array
    {
        $data = $request->validate([
            'server_id' => [
                'required',
                Rule::exists('servers', 'id')->where('workspace_id', $workspace->id),
            ],
            'deploy_path' => ['required', 'string', 'max:255'],
            'git_branch' => ['required', 'string', 'max:255'],
            'url' => ['nullable', 'url', 'max:255'],
            'build_mode' => ['sometimes', 'in:on_target,centralized'],
            'build_output_path' => ['nullable', 'string', 'max:255'],
        ]);

        $this->assertBuildModeCompatibleWithServer($data);

        return $data;
    }

    /**
     * Empêche les combinaisons build_mode/connection_type invalides dès la
     * soumission du formulaire plutôt que de laisser échouer le déploiement
     * plus tard (voir App\Transports) — un environnement existant qui n'est
     * jamais retouché n'est jamais revalidé, donc aucune régression possible
     * sur les environnements de prod actuels (tous en ssh_exec/on_target).
     */
    private function assertBuildModeCompatibleWithServer(array $data): void
    {
        $server = Server::query()->find($data['server_id']);
        $buildMode = $data['build_mode'] ?? 'on_target';

        if (! $server->requiresRemoteExec() && $buildMode !== 'centralized') {
            throw ValidationException::withMessages([
                'build_mode' => "Ce serveur ({$server->connection_type}) ne permet pas d'exécuter le pipeline à distance — choisissez le build centralisé.",
            ]);
        }

        if ($server->connection_type === 'ssh_exec' && $buildMode === 'centralized') {
            throw ValidationException::withMessages([
                'build_mode' => "Un build centralisé nécessite un serveur configuré pour la synchronisation (ssh_rsync, sftp ou ftp) — ssh_exec seul ne fournit pas de mécanisme de livraison.",
            ]);
        }

        if ($buildMode === 'centralized' && empty($data['build_output_path'])) {
            throw ValidationException::withMessages([
                'build_output_path' => 'Le dossier de sortie du build est requis en mode centralisé.',
            ]);
        }
    }
}
