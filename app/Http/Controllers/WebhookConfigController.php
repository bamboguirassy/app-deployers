<?php

namespace App\Http\Controllers;

use App\Models\Application;
use App\Models\Workspace;
use App\Models\Target;
use App\Models\WebhookConfig;
use App\Support\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class WebhookConfigController extends Controller
{
    /**
     * Active l'intégration webhook du provider donné pour ce target, et désactive
     * automatiquement les autres : un target ne peut être connecté qu'à un seul
     * remote git à la fois.
     */
    public function store(Request $request, Workspace $workspace, Application $application, Target $target): RedirectResponse
    {
        $this->authorize('manageTargetsAndPipeline', $application);
        abort_unless($target->application_id === $application->id, 404);

        $data = $request->validate([
            'provider' => ['required', 'in:github,gitlab,bitbucket'],
        ]);

        $webhookConfig = DB::transaction(function () use ($target, $data) {
            $target->webhookConfigs()->where('provider', '!=', $data['provider'])->update(['enabled' => false]);

            $webhookConfig = $target->webhookConfigs()->firstOrCreate(
                ['provider' => $data['provider']],
                ['secret' => Str::random(40), 'enabled' => true],
            );

            if (! $webhookConfig->wasRecentlyCreated && ! $webhookConfig->enabled) {
                $webhookConfig->update(['enabled' => true]);
            }

            return $webhookConfig;
        });

        AuditLogger::log($application, 'webhook_config.activated', $webhookConfig, $data);

        return back()->with('status', 'Webhook activé.');
    }

    /**
     * Révèle le secret en clair à la demande, pour que l'utilisateur puisse le coller
     * dans la configuration du provider Git. Jamais renvoyé automatiquement ailleurs
     * (le modèle le cache par défaut) : chaque révélation est tracée dans l'audit log.
     */
    public function revealSecret(Workspace $workspace, Application $application, WebhookConfig $webhookConfig): \Illuminate\Http\JsonResponse
    {
        $this->authorize('manageTargetsAndPipeline', $application);
        abort_unless($webhookConfig->target->application_id === $application->id, 404);

        AuditLogger::log($application, 'webhook_config.secret_revealed', $webhookConfig);

        $url = route('webhooks.receive', [$webhookConfig->provider, $webhookConfig->id]);

        return response()->json([
            'secret' => $webhookConfig->secret,
            'url' => $webhookConfig->provider === 'bitbucket' ? $url.'?secret='.$webhookConfig->secret : $url,
        ]);
    }

    public function update(Request $request, Workspace $workspace, Application $application, WebhookConfig $webhookConfig): RedirectResponse
    {
        $this->authorize('manageTargetsAndPipeline', $application);
        abort_unless($webhookConfig->target->application_id === $application->id, 404);

        $data = $request->validate([
            'enabled' => ['required', 'boolean'],
        ]);

        $webhookConfig->update($data);

        AuditLogger::log($application, 'webhook_config.updated', $webhookConfig, $data);

        return back()->with('status', 'Webhook mis à jour.');
    }

    public function destroy(Workspace $workspace, Application $application, WebhookConfig $webhookConfig): RedirectResponse
    {
        $this->authorize('manageTargetsAndPipeline', $application);
        abort_unless($webhookConfig->target->application_id === $application->id, 404);

        $webhookConfig->delete();

        AuditLogger::log($application, 'webhook_config.deleted', $webhookConfig);

        return back()->with('status', 'Webhook supprimé.');
    }

    public function storeBranchMapping(Request $request, Workspace $workspace, Application $application, WebhookConfig $webhookConfig): RedirectResponse
    {
        $this->authorize('manageTargetsAndPipeline', $application);
        abort_unless($webhookConfig->target->application_id === $application->id, 404);

        $data = $request->validate([
            'environment_id' => ['required', 'exists:environments,id'],
            'branch' => ['required', 'string', 'max:255'],
        ]);

        $mapping = $webhookConfig->branchMappings()->create($data);

        AuditLogger::log($application, 'webhook_branch_mapping.created', $mapping, $data);

        return back()->with('status', 'Mapping de branche ajouté.');
    }

    public function destroyBranchMapping(Workspace $workspace, Application $application, WebhookConfig $webhookConfig, \App\Models\WebhookBranchMapping $branchMapping): RedirectResponse
    {
        $this->authorize('manageTargetsAndPipeline', $application);
        abort_unless(
            $webhookConfig->target->application_id === $application->id && $branchMapping->webhook_config_id === $webhookConfig->id,
            404
        );

        $branchMapping->delete();

        return back()->with('status', 'Mapping supprimé.');
    }
}
