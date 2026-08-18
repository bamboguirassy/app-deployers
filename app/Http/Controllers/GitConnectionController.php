<?php

namespace App\Http\Controllers;

use App\Models\GitConnection;
use App\Models\Workspace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Spatie\Permission\PermissionRegistrar;

/**
 * Connexion OAuth directe à un provider Git (aujourd'hui : GitHub) pour lister
 * les dépôts accessibles et leurs branches, plutôt que de laisser l'utilisateur
 * saisir une URL de dépôt et un nom de branche à la main dans WebhooksPanel —
 * source d'erreurs de frappe et de branches inexistantes. Un seul provider
 * implémenté pour l'instant ; GitLab/Bitbucket suivraient le même schéma
 * (redirect/callback/repositories/branches) avec leurs endpoints propres.
 */
class GitConnectionController extends Controller
{
    private const SUPPORTED_PROVIDERS = ['github'];

    /**
     * `manageTargetsAndPipeline` (ApplicationPolicy) est scopé à une Application,
     * mais une connexion Git est partagée par tout le workspace — on vérifie
     * directement la permission Spatie sous-jacente (`pipeline.manage`), en
     * s'assurant que le "team" courant est bien ce workspace (déjà vrai dans les
     * routes sous /w/{workspace} via SetPermissionsTeam, pas dans le callback
     * OAuth global qui vit hors de ce préfixe).
     */
    private function ensureCanManage(Request $request, Workspace $workspace): void
    {
        app(PermissionRegistrar::class)->setPermissionsTeamId($workspace->id);
        abort_unless($request->user()?->can('pipeline.manage'), 403);
    }

    public function redirect(Request $request, Workspace $workspace, string $provider): RedirectResponse
    {
        $this->ensureCanManage($request, $workspace);
        abort_unless(in_array($provider, self::SUPPORTED_PROVIDERS, true), 404);

        $state = Str::random(40);
        Cache::put("git-oauth-state:{$state}", [
            'workspace_id' => $workspace->id,
            'redirect_back' => $request->headers->get('referer') ?? route('applications.index', $workspace->slug),
        ], now()->addMinutes(10));

        $query = http_build_query([
            'client_id' => config('services.github.client_id'),
            'redirect_uri' => route('git-connections.callback'),
            'scope' => 'repo read:user',
            'state' => $state,
        ]);

        return redirect()->away("https://github.com/login/oauth/authorize?{$query}");
    }

    public function callback(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string'],
            'state' => ['required', 'string'],
        ]);

        $stateData = Cache::pull("git-oauth-state:{$data['state']}");
        abort_unless($stateData, 419, 'La demande de connexion a expiré, réessayez.');

        // Compatibilité : ancien format (int) ou nouveau format (array)
        $workspaceId = is_array($stateData) ? $stateData['workspace_id'] : $stateData;
        $redirectBack = is_array($stateData) ? ($stateData['redirect_back'] ?? null) : null;

        $workspace = Workspace::findOrFail($workspaceId);
        $this->ensureCanManage($request, $workspace);

        $tokenResponse = Http::asJson()->withHeaders(['Accept' => 'application/json'])
            ->post('https://github.com/login/oauth/access_token', [
                'client_id' => config('services.github.client_id'),
                'client_secret' => config('services.github.client_secret'),
                'code' => $data['code'],
                'redirect_uri' => route('git-connections.callback'),
            ]);

        $accessToken = $tokenResponse->json('access_token');
        abort_if(! $tokenResponse->successful() || ! $accessToken, 502, 'Échec de la connexion à GitHub.');

        $userResponse = Http::withToken($accessToken)->acceptJson()->get('https://api.github.com/user');
        abort_unless($userResponse->successful(), 502, 'Échec de la récupération du compte GitHub.');

        $gitConnection = GitConnection::updateOrCreate(
            ['workspace_id' => $workspace->id, 'provider' => 'github'],
            [
                'created_by' => $request->user()->id,
                'account_login' => $userResponse->json('login'),
                'access_token' => $accessToken,
            ],
        );

        $fallback = route('applications.index', $workspace->slug);
        $destination = $redirectBack && str_starts_with($redirectBack, config('app.url'))
            ? $redirectBack
            : $fallback;

        return redirect()->to($destination)->with('status', 'Compte GitHub connecté.');
    }

    public function destroy(Request $request, Workspace $workspace, GitConnection $gitConnection): RedirectResponse
    {
        $this->ensureCanManage($request, $workspace);
        abort_unless($gitConnection->workspace_id === $workspace->id, 404);

        $gitConnection->delete();

        return back()->with('status', 'Connexion Git supprimée.');
    }

    /**
     * Liste des dépôts accessibles au compte connecté, mise en cache 5 minutes
     * (l'API GitHub est rate-limitée et cette liste change rarement dans
     * l'intervalle d'une session de configuration de webhook).
     */
    public function repositories(Request $request, Workspace $workspace, GitConnection $gitConnection): JsonResponse
    {
        $this->ensureCanManage($request, $workspace);
        abort_unless($gitConnection->workspace_id === $workspace->id, 404);

        $repositories = Cache::remember(
            "git-connection:{$gitConnection->id}:repositories",
            now()->addMinutes(5),
            function () use ($gitConnection) {
                $response = Http::withToken($gitConnection->access_token)->acceptJson()
                    ->get('https://api.github.com/user/repos', [
                        'per_page' => 100,
                        'sort' => 'updated',
                        'affiliation' => 'owner,collaborator,organization_member',
                    ]);

                abort_unless($response->successful(), 502, 'Échec de la récupération des dépôts GitHub.');

                // ->values()->all() plutôt que de renvoyer la Collection telle
                // quelle : une fois passée par Cache::remember (sérialisation/
                // désérialisation selon le driver de cache), on veut être certain
                // de retrouver un tableau PHP séquentiel (donc un array JSON côté
                // front), jamais un objet — sinon `(repositories ?? []).map()`
                // plante côté React quand la valeur cachée n'est ni null ni un array.
                return collect($response->json())
                    ->map(fn (array $repo) => [
                        'full_name' => $repo['full_name'],
                        'private' => $repo['private'],
                        'default_branch' => $repo['default_branch'],
                    ])
                    ->values()
                    ->all();
            },
        );

        return response()->json(['repositories' => array_values($repositories)]);
    }

    /**
     * Branches d'un dépôt donné, pour peupler le select de branche du mapping
     * webhook une fois le dépôt choisi.
     */
    public function branches(Request $request, Workspace $workspace, GitConnection $gitConnection): JsonResponse
    {
        $this->ensureCanManage($request, $workspace);
        abort_unless($gitConnection->workspace_id === $workspace->id, 404);

        $repository = $request->query('repository');
        abort_unless($repository, 422, 'Paramètre repository manquant.');

        // Ne pas mettre en cache les erreurs — seulement les succès.
        $cacheKey = "git-connection:{$gitConnection->id}:branches:{$repository}";
        if (Cache::has($cacheKey)) {
            return response()->json(['branches' => array_values(Cache::get($cacheKey))]);
        }

        // Récupère toutes les pages (GitHub plafonne à 100 branches par page).
        $branches = [];
        $page = 1;

        do {
            $response = Http::withToken($gitConnection->access_token)
                ->acceptJson()
                ->timeout(10)
                ->get("https://api.github.com/repos/{$repository}/branches", [
                    'per_page' => 100,
                    'page' => $page,
                ]);

            if ($response->status() === 404) {
                return response()->json(['branches' => null, 'access_denied' => true]);
            }

            if (! $response->successful()) {
                \Illuminate\Support\Facades\Log::warning('GitHub branches API error', [
                    'status' => $response->status(),
                    'repository' => $repository,
                    'body' => $response->body(),
                ]);

                return response()->json([
                    'branches' => null,
                    'error' => 'GitHub a répondu avec le code HTTP '.$response->status().'. Saisissez le nom de la branche manuellement.',
                ]);
            }

            $pageBranches = collect($response->json())->pluck('name')->all();
            $branches = array_merge($branches, $pageBranches);
            $page++;

            // Arrête quand la page est incomplète (dernière page atteinte).
        } while (count($pageBranches) === 100);

        Cache::put($cacheKey, $branches, now()->addMinutes(5));

        return response()->json(['branches' => array_values($branches)]);
    }
}
