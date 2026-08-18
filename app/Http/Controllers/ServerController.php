<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\FiltersLists;
use App\Models\Server;
use App\Models\Workspace;
use App\Services\SftpDirectoryBrowser;
use App\Services\SshConnectionTester;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class ServerController extends Controller
{
    use FiltersLists;

    public function __construct(
        private SshConnectionTester $sshTester,
        private SftpDirectoryBrowser $directoryBrowser,
    ) {
    }

    public function index(Workspace $workspace): Response
    {
        $this->authorize('manageServers', $workspace);

        $servers = $workspace->servers()->orderBy('name')->paginate(20);

        return Inertia::render('Servers/Index', [
            'servers' => ['data' => $servers->items()],
            'kpis' => $this->serverKpis($workspace),
        ]);
    }

    private function serverKpis(Workspace $workspace): array
    {
        $base = $workspace->servers();

        return [
            'total' => (clone $base)->count(),
            'password' => (clone $base)->where('auth_method', 'password')->count(),
            'ssh_key' => (clone $base)->where('auth_method', 'ssh_key')->count(),
        ];
    }

    public function search(Request $request, Workspace $workspace): JsonResponse
    {
        $this->authorize('manageServers', $workspace);

        $data = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'auth_method' => ['nullable', 'in:password,ssh_key'],
            'sort' => ['nullable', 'in:name,host,created_at'],
            'direction' => ['nullable', 'in:asc,desc'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $query = $workspace->servers();
        $this->applySearch($query, $data['search'] ?? null, ['servers.name', 'servers.host', 'servers.username']);

        if (! empty($data['auth_method'])) {
            $query->where('auth_method', $data['auth_method']);
        }

        $this->applySort($query, $data['sort'] ?? null, $data['direction'] ?? null, ['name', 'host', 'created_at'], 'name', 'asc');

        $servers = $query->paginate($this->perPage($data['per_page'] ?? null, 20));

        return response()->json([
            'data' => $servers->items(),
            'meta' => [
                'current_page' => $servers->currentPage(),
                'last_page' => $servers->lastPage(),
                'total' => $servers->total(),
                'per_page' => $servers->perPage(),
            ],
            'kpis' => $this->serverKpis($workspace),
        ]);
    }

    public function store(Request $request, Workspace $workspace): RedirectResponse|JsonResponse
    {
        $this->authorize('manageServers', $workspace);

        $data = $this->validated($request, $workspace);

        if ($data['auth_method'] === 'password' && ($data['password'] ?? '') === '') {
            throw ValidationException::withMessages(['password' => 'Le mot de passe est requis.']);
        }
        if ($data['auth_method'] === 'ssh_key' && ($data['private_key'] ?? '') === '') {
            throw ValidationException::withMessages(['private_key' => 'La clé privée est requise.']);
        }

        $server = $workspace->servers()->create([
            ...$data,
            'created_by' => auth()->id(),
        ]);

        if ($request->wantsJson()) {
            return response()->json($server->fresh());
        }

        return back()->with('status', 'Serveur ajouté.');
    }

    public function update(Request $request, Workspace $workspace, Server $server): RedirectResponse
    {
        $this->authorize('manageServers', $workspace);
        abort_unless($server->belongsToWorkspace($workspace), 404);

        $data = $this->validated($request, $workspace, $server);

        // Un champ d'identifiant laissé vide alors que la méthode d'auth n'a pas
        // changé signifie "ne pas modifier" (sinon rééditer juste le nom effacerait
        // silencieusement les identifiants déjà enregistrés). En revanche, s'il vient
        // de changer de méthode, une valeur manquante est une vraie erreur.
        $methodUnchanged = $server->auth_method === $data['auth_method'];

        if ($data['auth_method'] === 'password') {
            if (($data['password'] ?? '') === '') {
                if ($methodUnchanged) {
                    unset($data['password']);
                } else {
                    throw ValidationException::withMessages(['password' => 'Le mot de passe est requis.']);
                }
            }
        } else {
            if (($data['private_key'] ?? '') === '') {
                if ($methodUnchanged) {
                    unset($data['private_key']);
                } else {
                    throw ValidationException::withMessages(['private_key' => 'La clé privée est requise.']);
                }
            }
            if (($data['passphrase'] ?? '') === '' && $methodUnchanged) {
                unset($data['passphrase']);
            }
        }

        $server->update($data);

        return back()->with('status', 'Serveur mis à jour.');
    }

    public function destroy(Workspace $workspace, Server $server): RedirectResponse
    {
        $this->authorize('manageServers', $workspace);
        abort_unless($server->belongsToWorkspace($workspace), 404);

        if ($server->targetEnvironments()->exists()) {
            return back()->with('error', 'Ce serveur est utilisé par au moins un environnement de déploiement et ne peut pas être supprimé.');
        }

        $server->delete();

        return back()->with('status', 'Serveur supprimé.');
    }

    /**
     * Teste une connexion SSH avec les identifiants du formulaire, sans rien
     * enregistrer — utilisé avant la création d'un serveur.
     */
    public function testConnection(Request $request, Workspace $workspace): JsonResponse
    {
        $this->authorize('manageServers', $workspace);

        $data = $request->validate([
            'host' => ['required', 'string', 'max:255'],
            'port' => ['nullable', 'integer', 'min:1', 'max:65535'],
            'username' => ['required', 'string', 'max:255'],
            'auth_method' => ['required', 'in:password,ssh_key'],
            'password' => ['nullable', 'string'],
            'private_key' => ['nullable', 'string'],
            'passphrase' => ['nullable', 'string'],
        ]);

        if ($data['auth_method'] === 'password' && ($data['password'] ?? '') === '') {
            return response()->json(['success' => false, 'message' => 'Le mot de passe est requis pour tester la connexion.'], 422);
        }
        if ($data['auth_method'] === 'ssh_key' && ($data['private_key'] ?? '') === '') {
            return response()->json(['success' => false, 'message' => 'La clé privée est requise pour tester la connexion.'], 422);
        }

        $result = $this->sshTester->test(
            $data['host'],
            $data['port'] ?? 22,
            $data['username'],
            $data['auth_method'],
            $data['password'] ?? null,
            $data['private_key'] ?? null,
            $data['passphrase'] ?? null,
        );

        return response()->json($result);
    }

    /**
     * Teste la connexion d'un serveur déjà enregistré. Si le formulaire d'édition
     * contient de nouveaux identifiants non sauvegardés, ils sont testés en
     * priorité ; sinon on retombe sur les identifiants stockés en base.
     */
    public function testExisting(Request $request, Workspace $workspace, Server $server): JsonResponse
    {
        $this->authorize('manageServers', $workspace);
        abort_unless($server->belongsToWorkspace($workspace), 404);

        $data = $request->validate([
            'host' => ['nullable', 'string', 'max:255'],
            'port' => ['nullable', 'integer', 'min:1', 'max:65535'],
            'username' => ['nullable', 'string', 'max:255'],
            'auth_method' => ['nullable', 'in:password,ssh_key'],
            'password' => ['nullable', 'string'],
            'private_key' => ['nullable', 'string'],
            'passphrase' => ['nullable', 'string'],
        ]);

        $authMethod = $data['auth_method'] ?? $server->auth_method;
        $sameMethod = $authMethod === $server->auth_method;

        $password = ($data['password'] ?? '') !== ''
            ? $data['password']
            : ($sameMethod ? $server->password : null);

        $privateKey = ($data['private_key'] ?? '') !== ''
            ? $data['private_key']
            : ($sameMethod ? $server->private_key : null);

        $passphrase = ($data['passphrase'] ?? '') !== ''
            ? $data['passphrase']
            : ($sameMethod ? $server->passphrase : null);

        if ($authMethod === 'password' && ! $password) {
            return response()->json(['success' => false, 'message' => 'Aucun mot de passe disponible pour ce serveur.'], 422);
        }
        if ($authMethod === 'ssh_key' && ! $privateKey) {
            return response()->json(['success' => false, 'message' => 'Aucune clé privée disponible pour ce serveur.'], 422);
        }

        $result = $this->sshTester->test(
            $data['host'] ?? $server->host,
            $data['port'] ?? $server->port,
            $data['username'] ?? $server->username,
            $authMethod,
            $password,
            $privateKey,
            $passphrase,
        );

        return response()->json($result);
    }

    /**
     * Liste les sous-dossiers d'un chemin distant via SFTP, pour l'explorateur de
     * dossiers utilisé lors du choix du deploy_path d'un couple Target×Environnement.
     */
    public function browseDirectory(Request $request, Workspace $workspace, Server $server): JsonResponse
    {
        $this->authorize('manageServers', $workspace);
        abort_unless($server->belongsToWorkspace($workspace), 404);

        $data = $request->validate([
            'path' => ['nullable', 'string', 'max:1000'],
        ]);

        try {
            $result = $this->directoryBrowser->listDirectories($server, $data['path'] ?? '/');
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json($result);
    }

    /**
     * Parcourt le système de fichiers distant avec des credentials bruts (non
     * enregistrés) — utilisé par le formulaire de création avant que le serveur
     * ne soit persisté.
     */
    public function browseDirectoryAnon(Request $request, Workspace $workspace): JsonResponse
    {
        $this->authorize('manageServers', $workspace);

        $data = $request->validate([
            'host' => ['required', 'string', 'max:255'],
            'port' => ['nullable', 'integer', 'min:1', 'max:65535'],
            'username' => ['required', 'string', 'max:255'],
            'auth_method' => ['required', 'in:password,ssh_key'],
            'password' => ['nullable', 'string'],
            'private_key' => ['nullable', 'string'],
            'passphrase' => ['nullable', 'string'],
            'path' => ['nullable', 'string', 'max:1000'],
        ]);

        try {
            $result = $this->directoryBrowser->listDirectoriesWithCredentials(
                $data['host'],
                $data['port'] ?? 22,
                $data['username'],
                $data['auth_method'],
                $data['password'] ?? null,
                $data['private_key'] ?? null,
                $data['passphrase'] ?? null,
                $data['path'] ?? '/',
            );
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json($result);
    }

    private function validated(Request $request, Workspace $workspace, ?Server $server = null): array
    {
        $data = $request->validate([
            'name' => [
                'required', 'string', 'max:255',
                Rule::unique('servers', 'name')->where('workspace_id', $workspace->id)->ignore($server?->id),
            ],
            'host' => ['required', 'string', 'max:255'],
            'port' => ['nullable', 'integer', 'min:1', 'max:65535'],
            'username' => ['required', 'string', 'max:255'],
            'auth_method' => ['required', 'in:password,ssh_key'],
            'default_path' => ['nullable', 'string', 'max:500'],
            'password' => ['nullable', 'string'],
            'private_key' => ['nullable', 'string'],
            'passphrase' => ['nullable', 'string'],
        ]);

        $data['port'] = $data['port'] ?? 22;
        $data['default_path'] = ($data['default_path'] ?? '') !== '' ? rtrim($data['default_path'], '/') ?: '/' : '/';

        if ($data['auth_method'] === 'password') {
            $data['private_key'] = null;
            $data['passphrase'] = null;
        } else {
            $data['password'] = null;
        }

        return $data;
    }
}
