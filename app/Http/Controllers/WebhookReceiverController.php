<?php

namespace App\Http\Controllers;

use App\Models\WebhookConfig;
use App\Services\DeploymentAlreadyRunningException;
use App\Services\DeploymentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class WebhookReceiverController extends Controller
{
    public function __construct(private DeploymentService $deployments)
    {
    }

    /**
     * Type de retour large (Symfony\Component\HttpFoundation\Response) car les
     * branches mélangent `response('...', code)` (Illuminate\Http\Response) et
     * `response()->json(...)` (Illuminate\Http\JsonResponse) — les deux
     * n'ont que ce type Symfony en commun. Une signature `Illuminate\Http\Response`
     * plantait en TypeError (500) sur toutes les branches JSON.
     */
    public function handle(Request $request, string $provider, WebhookConfig $webhookConfig): Response
    {
        if ($webhookConfig->provider !== $provider || ! $webhookConfig->enabled) {
            return response('Not found', 404);
        }

        if (! $this->verifySignature($request, $webhookConfig)) {
            Log::warning('Webhook signature verification failed', ['webhook_config_id' => $webhookConfig->id]);

            return response('Invalid signature', 401);
        }

        $payload = $request->json()->all();
        [$branch, $commitSha] = $this->extractBranchAndCommit($provider, $payload);

        if (! $branch) {
            return response('No branch found in payload', 422);
        }

        $mapping = $webhookConfig->branchMappings()->where('branch', $branch)->first();

        if (! $mapping) {
            return response()->json(['message' => "Aucun mapping pour la branche {$branch}, ignoré."]);
        }

        // Clé de dédoublonnage basée sur l'ID de livraison du provider quand il
        // est fourni (identifie une requête HTTP précise, pas juste son
        // contenu) — TTL long (24h) : au-delà de couvrir les retries légitimes
        // du provider, ça empêche qu'une requête signée capturée (logs, proxy)
        // ne puisse être rejouée pour déclencher un nouveau déploiement une
        // fois la fenêtre de dédoublonnage précédente (30s) écoulée. À défaut
        // d'ID de livraison (Bitbucket sans en-tête dédié), on retombe sur
        // branche+commit avec le même TTL.
        $deliveryId = $this->extractDeliveryId($provider, $request) ?? $branch.':'.$commitSha;
        $dedupeKey = 'webhook:dedupe:'.$webhookConfig->id.':'.md5($deliveryId);

        if (! Cache::add($dedupeKey, true, now()->addHours(24))) {
            return response()->json(['message' => 'Doublon ignoré (même livraison déjà traitée).']);
        }

        $targetEnvironment = $webhookConfig->target->targetEnvironments()
            ->where('environment_id', $mapping->environment_id)
            ->first();

        if (! $targetEnvironment) {
            return response('Target/environnement non configuré', 422);
        }

        try {
            $deployment = $this->deployments->trigger(
                $targetEnvironment,
                source: 'webhook',
                commitSha: $commitSha,
                branch: $branch,
            );
        } catch (DeploymentAlreadyRunningException $e) {
            return response()->json(['message' => $e->getMessage()], 202);
        }

        return response()->json(['deployment_id' => $deployment->id], 202);
    }

    private function verifySignature(Request $request, WebhookConfig $webhookConfig): bool
    {
        return match ($webhookConfig->provider) {
            'github' => $this->verifyGithub($request, $webhookConfig->secret),
            'gitlab' => hash_equals($webhookConfig->secret, (string) $request->header('X-Gitlab-Token')),
            // Bitbucket Cloud ne propose pas de signature HMAC ni d'en-tête personnalisé :
            // le secret transite par la query string par défaut (risque de fuite dans les
            // logs d'accès). Si un reverse proxy ou Bitbucket Server ajoute un en-tête
            // X-Webhook-Secret, on le préfère.
            'bitbucket' => hash_equals(
                $webhookConfig->secret,
                (string) ($request->header('X-Webhook-Secret') ?? $request->query('secret')),
            ),
            default => false,
        };
    }

    private function verifyGithub(Request $request, string $secret): bool
    {
        $signature = (string) $request->header('X-Hub-Signature-256');

        if (! Str::startsWith($signature, 'sha256=')) {
            return false;
        }

        $expected = 'sha256='.hash_hmac('sha256', $request->getContent(), $secret);

        return hash_equals($expected, $signature);
    }

    /**
     * En-tête d'identifiant de livraison propre à chaque provider — unique par
     * requête HTTP envoyée (y compris pour un retry, qui réutilise le même
     * ID), contrairement à branche+commit qui identifie le contenu.
     */
    private function extractDeliveryId(string $provider, Request $request): ?string
    {
        return match ($provider) {
            'github' => $request->header('X-GitHub-Delivery'),
            'gitlab' => $request->header('X-Gitlab-Event-UUID'),
            'bitbucket' => $request->header('X-Request-UUID'),
            default => null,
        };
    }

    private function extractBranchAndCommit(string $provider, array $payload): array
    {
        return match ($provider) {
            'github', 'gitlab' => [
                isset($payload['ref']) ? Str::after($payload['ref'], 'refs/heads/') : null,
                $payload['after'] ?? $payload['checkout_sha'] ?? null,
            ],
            'bitbucket' => [
                $payload['push']['changes'][0]['new']['name'] ?? null,
                $payload['push']['changes'][0]['new']['target']['hash'] ?? null,
            ],
            default => [null, null],
        };
    }
}
