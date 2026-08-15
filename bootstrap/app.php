<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // SetLocale doit s'exécuter après EncryptCookies (sinon le cookie
        // `locale` entrant est encore chiffré et jamais reconnu) mais avant
        // HandleInertiaRequests (qui partage app()->getLocale() en prop) —
        // append place le middleware après le groupe 'web' par défaut de
        // Laravel (qui inclut déjà EncryptCookies), dans l'ordre déclaré ici.
        $middleware->web(append: [
            \App\Http\Middleware\SetLocale::class,
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'permissions.team' => \App\Http\Middleware\SetPermissionsTeam::class,
            'super_admin' => \App\Http\Middleware\EnsureIsSuperAdmin::class,
        ]);

        // Les webhooks entrants (GitHub/GitLab/Bitbucket) sont authentifiés par
        // signature HMAC/token, pas par session — ils ne portent jamais de jeton CSRF.
        $middleware->validateCsrfTokens(except: [
            'webhooks/*',
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );
    })->create();
