<?php

use App\Http\Controllers\Admin\AdminDashboardController;
use App\Http\Controllers\Admin\AdminDeploymentController;
use App\Http\Controllers\Admin\AdminPlanController;
use App\Http\Controllers\Admin\AdminSubscriptionController;
use App\Http\Controllers\Admin\AdminUserController;
use App\Http\Controllers\Admin\AdminWorkspaceController;
use App\Http\Controllers\ApplicationController;
use App\Http\Controllers\ApplicationMemberController;
use App\Http\Controllers\BillingController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DeploymentController;
use App\Http\Controllers\EnvironmentController;
use App\Http\Controllers\EnvironmentVariableController;
use App\Http\Controllers\GitConnectionController;
use App\Http\Controllers\PaddleWebhookController;
use App\Http\Controllers\PipelineStepController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ServerController;
use App\Http\Controllers\TargetController;
use App\Http\Controllers\TargetEnvironmentController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\WebhookConfigController;
use App\Http\Controllers\WebhookReceiverController;
use App\Http\Controllers\WorkspaceController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Anglais : locale par défaut, URLs sans préfixe. Ce sont les URLs
// "nouvelles" créées pour l'i18n — voir CLAUDE.md, section i18n.
//
// Volontairement accessible aux utilisateurs connectés (pas de redirection
// vers `home`) : un utilisateur doit pouvoir consulter librement la home
// publique depuis son workspace (MarketingLayout affiche alors un bouton
// "Aller au workspace" à la place de Login/Register pour revenir facilement).
Route::get('/', fn () => Inertia::render('Welcome'))->name('welcome');

// Pages légales publiques, requises pour l'approbation du domaine par Paddle
// (Checkout > Website approval) : conditions d'utilisation, confidentialité,
// remboursement. Volontairement hors du groupe 'auth' — accessibles sans
// connexion, y compris par les robots de vérification de Paddle.
//
// IMPORTANT (i18n) : ces URLs (/terms, /privacy, /refunds) sont déjà indexées
// par Google et servent aujourd'hui du contenu FRANÇAIS malgré leurs noms de
// route à consonance anglaise — ne jamais remplacer leur contenu par de
// l'anglais, ni les déplacer. Les versions anglaises vivent à des chemins
// distincts (legal.*.en) pour ne prendre aucun risque sur ce référencement
// déjà acquis, symétriquement aux pages marketing ci-dessous.
Route::get('/terms', fn () => Inertia::render('Legal/Terms'))->name('legal.terms');
Route::get('/privacy', fn () => Inertia::render('Legal/Privacy'))->name('legal.privacy');
Route::get('/refunds', fn () => Inertia::render('Legal/Refunds'))->name('legal.refunds');
Route::get('/legal/terms-of-service', fn () => Inertia::render('Legal/TermsEn'))->name('legal.terms.en');
Route::get('/legal/privacy-policy', fn () => Inertia::render('Legal/PrivacyEn'))->name('legal.privacy.en');
Route::get('/legal/refund-policy', fn () => Inertia::render('Legal/RefundsEn'))->name('legal.refunds.en');

// Pages marketing dédiées (SEO) — anciennement des sections ancrées de
// Welcome.tsx, éclatées en pages indexables à part entière. Voir CLAUDE.md,
// section "Pages marketing dédiées (SEO)".
//
// IMPORTANT (i18n) : ces URLs françaises sont déjà indexées — contenu et
// slugs volontairement inchangés. Les nouvelles pages anglaises (défaut)
// vivent à des chemins distincts, en anglais, ci-dessous.
Route::get('/fonctionnalites', fn () => Inertia::render('Marketing/Fonctionnalites'))->name('marketing.features');
Route::get('/comment-ca-marche', fn () => Inertia::render('Marketing/CommentCaMarche'))->name('marketing.how-it-works');
Route::get('/tarifs', fn () => Inertia::render('Marketing/Tarifs'))->name('marketing.pricing');
Route::get('/securite', fn () => Inertia::render('Marketing/Securite'))->name('marketing.security');

Route::get('/features', fn () => Inertia::render('Marketing/Features'))->name('marketing.features.en');
Route::get('/how-it-works', fn () => Inertia::render('Marketing/HowItWorks'))->name('marketing.how-it-works.en');
Route::get('/pricing', fn () => Inertia::render('Marketing/Pricing'))->name('marketing.pricing.en');
Route::get('/security', fn () => Inertia::render('Marketing/Security'))->name('marketing.security.en');

// Accueil français : contenu identique à l'ancien '/' (avant l'introduction
// de l'i18n), déplacé ici tel quel. C'est la seule URL déjà indexée dont le
// contenu servi à '/' change (français → anglais) : '/' ne peut pas porter
// deux contenus, donc c'est un compromis assumé et limité à cette seule page
// — toutes les autres URLs françaises restent strictement inchangées.
Route::get('/fr', fn () => Inertia::render('WelcomeFr'))->name('welcome.fr');

Route::middleware('auth')->group(function () {
    Route::get('/home', [WorkspaceController::class, 'redirectToDefault'])->name('home');
    Route::get('/workspaces/create', [WorkspaceController::class, 'create'])->name('workspaces.create');
    Route::post('/workspaces', [WorkspaceController::class, 'store'])->name('workspaces.store');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // Callback OAuth global (hors du préfixe /w/{workspace}) : l'URL de callback
    // enregistrée côté provider (GitHub) est fixe et ne peut pas contenir le slug
    // du workspace — celui-ci est retrouvé via le paramètre `state` signé généré
    // par GitConnectionController::redirect().
    Route::get('/git-connections/github/callback', [GitConnectionController::class, 'callback'])->name('git-connections.callback');

    Route::middleware('permissions.team')->prefix('w/{workspace}')->group(function () {
        Route::get('/dashboard', [DashboardController::class, 'index'])->middleware('verified')->name('dashboard');

        Route::get('/applications', [ApplicationController::class, 'index'])->name('applications.index');
        Route::post('/applications/search', [ApplicationController::class, 'search'])->name('applications.search');
        Route::get('/applications/create', [ApplicationController::class, 'create'])->name('applications.create');
        Route::post('/applications', [ApplicationController::class, 'store'])->name('applications.store');

        Route::get('/billing', [BillingController::class, 'show'])->name('billing.show');
        Route::post('/billing/checkout', [BillingController::class, 'checkout'])->name('billing.checkout');

        Route::get('/deployments', [DeploymentController::class, 'indexAll'])->name('deployments.all');
        Route::post('/deployments/search', [DeploymentController::class, 'searchAll'])->name('deployments.all.search');

        Route::get('/servers', [ServerController::class, 'index'])->name('servers.index');
        Route::post('/servers/search', [ServerController::class, 'search'])->name('servers.search');
        Route::post('/servers/test-connection', [ServerController::class, 'testConnection'])->name('servers.test-connection');
        Route::post('/servers/browse-directory-anon', [ServerController::class, 'browseDirectoryAnon'])->name('servers.browse-directory-anon');
        Route::post('/servers', [ServerController::class, 'store'])->name('servers.store');
        Route::patch('/servers/{server}', [ServerController::class, 'update'])->name('servers.update');
        Route::delete('/servers/{server}', [ServerController::class, 'destroy'])->name('servers.destroy');
        Route::post('/servers/{server}/test-connection', [ServerController::class, 'testExisting'])->name('servers.test-existing');
        Route::post('/servers/{server}/browse-directory', [ServerController::class, 'browseDirectory'])->name('servers.browse-directory');

        Route::get('/git-connections/{provider}/redirect', [GitConnectionController::class, 'redirect'])->name('git-connections.redirect');
        Route::delete('/git-connections/{gitConnection}', [GitConnectionController::class, 'destroy'])->name('git-connections.destroy');
        Route::get('/git-connections/{gitConnection}/repositories', [GitConnectionController::class, 'repositories'])->name('git-connections.repositories');
        Route::get('/git-connections/{gitConnection}/branches', [GitConnectionController::class, 'branches'])
            ->name('git-connections.branches');

        Route::get('/users', [UserController::class, 'index'])->name('users.index');
        Route::post('/users/search', [UserController::class, 'search'])->name('users.search');
        Route::post('/users', [UserController::class, 'store'])->name('users.store');
        Route::get('/users/{user}', [UserController::class, 'show'])->name('users.show');
        Route::patch('/users/{user}', [UserController::class, 'update'])->name('users.update');
        Route::delete('/users/{user}', [UserController::class, 'destroy'])->name('users.destroy');
        Route::post('/users/{user}/resend-verification', [UserController::class, 'resendVerification'])->name('users.resend-verification');
        Route::post('/users/{user}/send-password-reset', [UserController::class, 'sendPasswordReset'])->name('users.send-password-reset');
        Route::post('/users/{user}/toggle-suspend', [UserController::class, 'toggleSuspend'])->name('users.toggle-suspend');

        Route::prefix('applications/{application}')->group(function () {
            Route::get('/', [ApplicationController::class, 'show'])->name('applications.show');
            Route::post('/', [ApplicationController::class, 'update'])->name('applications.update');
            Route::delete('/', [ApplicationController::class, 'destroy'])->name('applications.destroy');

            Route::post('/targets', [TargetController::class, 'store'])->name('targets.store');
            Route::patch('/targets/{target}', [TargetController::class, 'update'])->name('targets.update');
            Route::delete('/targets/{target}', [TargetController::class, 'destroy'])->name('targets.destroy');

            Route::post('/environments', [EnvironmentController::class, 'store'])->name('environments.store');
            Route::patch('/environments/{environment}', [EnvironmentController::class, 'update'])->name('environments.update');
            Route::delete('/environments/{environment}', [EnvironmentController::class, 'destroy'])->name('environments.destroy');

            Route::post('/targets/{target}/steps', [PipelineStepController::class, 'store'])->name('pipeline-steps.store');
            Route::patch('/targets/{target}/steps/{pipelineStep}', [PipelineStepController::class, 'update'])->name('pipeline-steps.update');
            Route::delete('/targets/{target}/steps/{pipelineStep}', [PipelineStepController::class, 'destroy'])->name('pipeline-steps.destroy');
            Route::post('/targets/{target}/steps/reorder', [PipelineStepController::class, 'reorder'])->name('pipeline-steps.reorder');

            Route::post('/targets/{target}/environments/{environment}', [TargetEnvironmentController::class, 'store'])->name('target-environments.store');
            Route::patch('/target-environments/{targetEnvironment}', [TargetEnvironmentController::class, 'update'])->name('target-environments.update');

            Route::post('/target-environments/{targetEnvironment}/variables', [EnvironmentVariableController::class, 'store'])->name('environment-variables.store');
            Route::patch('/variables/{environmentVariable}', [EnvironmentVariableController::class, 'update'])->name('environment-variables.update');
            Route::delete('/variables/{environmentVariable}', [EnvironmentVariableController::class, 'destroy'])->name('environment-variables.destroy');

            Route::post('/targets/{target}/webhooks', [WebhookConfigController::class, 'store'])->name('webhook-configs.store');
            Route::post('/webhooks/{webhookConfig}/reveal-secret', [WebhookConfigController::class, 'revealSecret'])->name('webhook-configs.reveal-secret');
            Route::patch('/webhooks/{webhookConfig}', [WebhookConfigController::class, 'update'])->name('webhook-configs.update');
            Route::delete('/webhooks/{webhookConfig}', [WebhookConfigController::class, 'destroy'])->name('webhook-configs.destroy');

            Route::get('/deployments', [DeploymentController::class, 'index'])->name('deployments.index');
            Route::post('/deployments/search', [DeploymentController::class, 'search'])->name('deployments.search');
            Route::get('/deployments/{deployment}', [DeploymentController::class, 'show'])->name('deployments.show');
            Route::post('/target-environments/{targetEnvironment}/deploy', [DeploymentController::class, 'store'])->name('deployments.store');
            Route::post('/environments/{environment}/deploy', [DeploymentController::class, 'storeForEnvironment'])->name('deployments.store-environment');
            Route::post('/deployments/{deployment}/cancel', [DeploymentController::class, 'cancel'])->name('deployments.cancel');
            Route::post('/deployments/{deployment}/retry', [DeploymentController::class, 'retry'])->name('deployments.retry');
            Route::post('/deployments/{deployment}/rollback', [DeploymentController::class, 'rollback'])->name('deployments.rollback');

            Route::post('/members/search', [ApplicationMemberController::class, 'search'])->name('members.search');
            Route::post('/members', [ApplicationMemberController::class, 'store'])->name('members.store');
            Route::delete('/members/{user}', [ApplicationMemberController::class, 'destroy'])->name('members.destroy');
        });
    });
});

// Panneau super-admin plateforme — totalement séparé des routes w/{workspace},
// protégé par le middleware `super_admin` (indépendant des rôles Spatie par workspace).
Route::middleware(['auth', 'verified', 'super_admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/', [AdminDashboardController::class, 'index'])->name('dashboard');

    Route::get('/workspaces', [AdminWorkspaceController::class, 'index'])->name('workspaces.index');
    Route::post('/workspaces/search', [AdminWorkspaceController::class, 'search'])->name('workspaces.search');
    Route::get('/workspaces/{workspace}', [AdminWorkspaceController::class, 'show'])->name('workspaces.show');
    Route::post('/workspaces/{workspace}/suspend', [AdminWorkspaceController::class, 'suspend'])->name('workspaces.suspend');
    Route::post('/workspaces/{workspace}/reactivate', [AdminWorkspaceController::class, 'reactivate'])->name('workspaces.reactivate');
    Route::delete('/workspaces/{workspace}', [AdminWorkspaceController::class, 'destroy'])->name('workspaces.destroy');
    Route::patch('/workspaces/{workspace}/subscription', [AdminSubscriptionController::class, 'update'])->name('workspaces.subscription.update');
    Route::post('/workspaces/{workspace}/subscription/grant-free', [AdminSubscriptionController::class, 'grantFree'])->name('workspaces.subscription.grant-free');
    Route::post('/workspaces/{workspace}/subscription/revoke-free', [AdminSubscriptionController::class, 'revokeFree'])->name('workspaces.subscription.revoke-free');

    Route::get('/plans', [AdminPlanController::class, 'index'])->name('plans.index');
    Route::patch('/plans/{plan}', [AdminPlanController::class, 'update'])->name('plans.update');

    Route::get('/users', [AdminUserController::class, 'index'])->name('users.index');
    Route::post('/users/search', [AdminUserController::class, 'search'])->name('users.search');
    Route::post('/users/{user}/promote', [AdminUserController::class, 'promote'])->name('users.promote');
    Route::post('/users/{user}/demote', [AdminUserController::class, 'demote'])->name('users.demote');

    // Monitoring cross-workspace des déploiements — lecture seule uniquement,
    // voir AdminDeploymentController pour le raisonnement sur l'isolation vis-à-vis
    // de l'ability `deploy` (mutation) d'ApplicationPolicy.
    Route::get('/deployments', [AdminDeploymentController::class, 'index'])->name('deployments.index');
    Route::post('/deployments/search', [AdminDeploymentController::class, 'search'])->name('deployments.search');
    Route::get('/deployments/{deployment:uuid}', [AdminDeploymentController::class, 'show'])->name('deployments.show');
});

// Webhooks entrants — publics, authentifiés par signature/token, jamais par session.
Route::post('/webhooks/{provider}/{webhookConfig}', [WebhookReceiverController::class, 'handle'])
    ->middleware('throttle:webhooks')
    ->name('webhooks.receive');

Route::post('/webhooks/paddle', [PaddleWebhookController::class, 'handle'])
    ->middleware('throttle:webhooks')
    ->name('webhooks.paddle');

Route::get('/sitemap.xml', function () {
    // Login/Register sont volontairement absents : ce sont des pages
    // d'authentification sans contenu à indexer (voir robots.txt, qui les
    // laisse sous le Disallow: / général).
    //
    // i18n : chaque paire EN/FR porte des hreflang alternates réciproques
    // (+ x-default vers la version anglaise), voir CLAUDE.md section i18n.
    $pairs = [
        ['en' => 'welcome', 'fr' => 'welcome.fr', 'changefreq' => 'weekly', 'priority' => '1.0'],
        ['en' => 'marketing.pricing.en', 'fr' => 'marketing.pricing', 'changefreq' => 'weekly', 'priority' => '0.9'],
        ['en' => 'marketing.features.en', 'fr' => 'marketing.features', 'changefreq' => 'monthly', 'priority' => '0.8'],
        ['en' => 'marketing.security.en', 'fr' => 'marketing.security', 'changefreq' => 'monthly', 'priority' => '0.7'],
        ['en' => 'marketing.how-it-works.en', 'fr' => 'marketing.how-it-works', 'changefreq' => 'monthly', 'priority' => '0.6'],
        ['en' => 'legal.terms.en', 'fr' => 'legal.terms', 'changefreq' => 'monthly', 'priority' => '0.3'],
        ['en' => 'legal.privacy.en', 'fr' => 'legal.privacy', 'changefreq' => 'monthly', 'priority' => '0.3'],
        ['en' => 'legal.refunds.en', 'fr' => 'legal.refunds', 'changefreq' => 'monthly', 'priority' => '0.3'],
    ];

    $urls = [];

    foreach ($pairs as $pair) {
        $alternates = [
            'en' => route($pair['en']),
            'fr' => route($pair['fr']),
            'x-default' => route($pair['en']),
        ];

        $urls[] = ['loc' => $alternates['en'], 'lastmod' => '2026-08-15', 'changefreq' => $pair['changefreq'], 'priority' => $pair['priority'], 'alternates' => $alternates];
        $urls[] = ['loc' => $alternates['fr'], 'lastmod' => '2026-08-15', 'changefreq' => $pair['changefreq'], 'priority' => $pair['priority'], 'alternates' => $alternates];
    }

    return response()
        ->view('sitemap', ['urls' => $urls])
        ->header('Content-Type', 'application/xml');
})->name('sitemap');

// Sélecteur de langue explicite (dashboard) — pose le cookie `locale` que
// App\Http\Middleware\SetLocale lira ensuite pour toutes les pages sans
// locale fixe (dashboard, login/register). Redirige vers la page d'origine ;
// Inertia traite ça comme une visite normale, donc la prop partagée `locale`
// se met à jour et LocaleSync (resources/js/lib/i18n/LocaleSync.tsx)
// resynchronise i18next automatiquement.
Route::post('/locale', function (\Illuminate\Http\Request $request) {
    $locale = $request->validate(['locale' => 'required|in:en,fr'])['locale'];

    return redirect()->back()->withCookie(cookie('locale', $locale, 60 * 24 * 365));
})->name('locale.set');

require __DIR__.'/auth.php';
