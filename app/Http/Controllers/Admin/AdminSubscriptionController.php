<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use App\Models\SubscriptionHistory;
use App\Models\Workspace;
use App\Support\PlatformAuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class AdminSubscriptionController extends Controller
{
    // Vocabulaire de statut conforme à celui déjà utilisé par PaddleWebhookController.
    private const STATUSES = ['active', 'past_due', 'canceled'];

    public function update(Request $request, Workspace $workspace): RedirectResponse
    {
        $this->authorize('platform-admin.manageSubscriptions');

        $data = $request->validate([
            'plan_id' => ['nullable', 'exists:plans,id'],
            'status' => ['nullable', 'in:'.implode(',', self::STATUSES)],
        ]);

        if (empty($data['plan_id']) && empty($data['status'])) {
            return back()->with('error', 'Aucune modification fournie.');
        }

        $subscription = $workspace->subscription;

        if (! $subscription) {
            return back()->with('error', "Ce workspace n'a pas d'abonnement à modifier.");
        }

        $before = $subscription->only(['plan_id', 'status', 'is_comped']);

        if (! empty($data['plan_id'])) {
            $subscription->plan_id = $data['plan_id'];
        }

        if (! empty($data['status'])) {
            $subscription->status = $data['status'];
        }

        // Une édition manuelle plan/statut sort explicitement du régime "offert
        // gratuitement" — voir grantFree()/revokeFree() pour ce cas dédié.
        $subscription->is_comped = false;

        $subscription->save();

        PlatformAuditLogger::log('workspace.subscription.update', $subscription, [
            'before' => $before,
            'after' => $subscription->only(['plan_id', 'status', 'is_comped']),
        ]);

        SubscriptionHistory::create([
            'workspace_id' => $workspace->id,
            'plan_id' => $subscription->plan_id,
            'status' => $subscription->status,
            'interval' => $subscription->interval,
            'changed_by_user_id' => auth()->id(),
            'source' => 'admin',
        ]);

        return back()->with('status', "Abonnement du workspace {$workspace->name} mis à jour.");
    }

    /**
     * Offre le plan Pro gratuitement à ce workspace — jamais facturé via
     * Paddle : on détache volontairement les identifiants Paddle existants
     * pour qu'un futur webhook (renouvellement, échec de paiement...) sur un
     * ancien abonnement réel ne vienne pas écraser ce don silencieusement.
     */
    public function grantFree(Request $request, Workspace $workspace): RedirectResponse
    {
        $this->authorize('platform-admin.manageSubscriptions');

        $data = $request->validate([
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $proPlan = Plan::query()->where('slug', 'pro')->firstOrFail();
        $subscription = $workspace->subscription;

        if (! $subscription) {
            return back()->with('error', "Ce workspace n'a pas d'abonnement à modifier.");
        }

        $before = $subscription->only(['plan_id', 'status', 'is_comped']);

        $subscription->update([
            'plan_id' => $proPlan->id,
            'status' => 'active',
            'is_comped' => true,
            'paddle_customer_id' => null,
            'paddle_subscription_id' => null,
            'grace_period_ends_at' => null,
            'renews_at' => null,
        ]);

        PlatformAuditLogger::log('workspace.subscription.grant_free', $subscription, [
            'before' => $before,
            'after' => $subscription->only(['plan_id', 'status', 'is_comped']),
            'note' => $data['note'] ?? null,
        ]);

        SubscriptionHistory::create([
            'workspace_id' => $workspace->id,
            'plan_id' => $subscription->plan_id,
            'status' => $subscription->status,
            'interval' => $subscription->interval,
            'changed_by_user_id' => auth()->id(),
            'source' => 'admin',
            'note' => $data['note'] ?? 'Plan Pro offert gratuitement par un administrateur.',
        ]);

        return back()->with('status', "Plan Pro offert gratuitement au workspace {$workspace->name}.");
    }

    /**
     * Retire une offre gratuite précédemment accordée via grantFree() — le
     * workspace retombe sur le plan Free (jamais sur un plan payant, puisque
     * ce chemin ne concerne que des abonnements sans lien Paddle réel).
     */
    public function revokeFree(Workspace $workspace): RedirectResponse
    {
        $this->authorize('platform-admin.manageSubscriptions');

        $subscription = $workspace->subscription;

        if (! $subscription || ! $subscription->is_comped) {
            return back()->with('error', "Ce workspace n'a pas d'offre gratuite active.");
        }

        $freePlan = Plan::free();
        $before = $subscription->only(['plan_id', 'status', 'is_comped']);

        $subscription->update([
            'plan_id' => $freePlan->id,
            'is_comped' => false,
        ]);

        PlatformAuditLogger::log('workspace.subscription.revoke_free', $subscription, [
            'before' => $before,
            'after' => $subscription->only(['plan_id', 'status', 'is_comped']),
        ]);

        SubscriptionHistory::create([
            'workspace_id' => $workspace->id,
            'plan_id' => $subscription->plan_id,
            'status' => $subscription->status,
            'interval' => $subscription->interval,
            'changed_by_user_id' => auth()->id(),
            'source' => 'admin',
            'note' => 'Offre gratuite retirée — retour au plan Free.',
        ]);

        return back()->with('status', "Offre gratuite retirée pour le workspace {$workspace->name}.");
    }
}
