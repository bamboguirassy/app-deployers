<?php

namespace App\Providers;

use App\Events\DeploymentStatusUpdated;
use App\Listeners\NotifyOnDeploymentFailure;
use App\Policies\PlatformAdminPolicy;
use Illuminate\Auth\Events\Registered;
use Illuminate\Auth\Listeners\SendEmailVerificationNotification;
use Illuminate\Auth\Middleware\RedirectIfAuthenticated;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        // Le middleware "guest" par défaut (routes/auth.php : /login, /register...)
        // redirige tout utilisateur déjà connecté vers route('dashboard') — mais
        // cette route exige un paramètre {workspace} (w/{workspace}/dashboard),
        // ce que le comportement par défaut de Laravel ne sait pas fournir. Ça
        // levait une UrlGenerationException (500) à chaque fois qu'un utilisateur
        // connecté visitait /login. route('home') existe précisément pour ce cas
        // (WorkspaceController::redirectToDefault choisit un workspace par défaut).
        RedirectIfAuthenticated::redirectUsing(fn () => route('home'));

        Event::listen(DeploymentStatusUpdated::class, NotifyOnDeploymentFailure::class);

        // Pas d'app/Providers/EventServiceProvider dans ce squelette Laravel 11+ :
        // le mapping Registered -> SendEmailVerificationNotification que Laravel
        // enregistre normalement via EventServiceProvider::configureEmailVerification()
        // doit être câblé explicitement, sinon aucun email de vérification ne part
        // à l'inscription malgré `User implements MustVerifyEmail`.
        Event::listen(Registered::class, SendEmailVerificationNotification::class);

        // Webhooks entrants : limite par (IP, config de webhook) pour encaisser les
        // retries légitimes des providers tout en freinant le brute-force de secret.
        RateLimiter::for('webhooks', function ($request) {
            return Limit::perMinute(30)->by($request->ip().'|'.$request->route('webhookConfig'));
        });

        // PlatformAdminPolicy n'est liée à aucun modèle (pas de discovery Spatie
        // automatique) : on relie ses abilities via Gate::define.
        $policy = app(PlatformAdminPolicy::class);
        Gate::define('platform-admin.access', [$policy, 'access']);
        Gate::define('platform-admin.manageWorkspaces', [$policy, 'manageWorkspaces']);
        Gate::define('platform-admin.manageSubscriptions', [$policy, 'manageSubscriptions']);
        Gate::define('platform-admin.manageUsers', [$policy, 'manageUsers']);
        Gate::define('platform-admin.managePlans', [$policy, 'managePlans']);
    }
}
