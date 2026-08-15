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

Route::get('/', function () {
    if (auth()->check()) {
        return redirect()->route('home');
    }

    return Inertia::render('Welcome');
})->name('welcome');

// Pages légales publiques, requises pour l'approbation du domaine par Paddle
// (Checkout > Website approval) : conditions d'utilisation, confidentialité,
// remboursement. Volontairement hors du groupe 'auth' — accessibles sans
// connexion, y compris par les robots de vérification de Paddle.
Route::get('/terms', fn () => Inertia::render('Legal/Terms'))->name('legal.terms');
Route::get('/privacy', fn () => Inertia::render('Legal/Privacy'))->name('legal.privacy');
Route::get('/refunds', fn () => Inertia::render('Legal/Refunds'))->name('legal.refunds');

// Pages marketing dédiées (SEO) — anciennement des sections ancrées de
// Welcome.tsx, éclatées en pages indexables à part entière. Voir
// CLAUDE.md, section "Pages marketing dédiées (SEO)".
Route::get('/fonctionnalites', fn () => Inertia::render('Marketing/Fonctionnalites'))->name('marketing.features');
Route::get('/comment-ca-marche', fn () => Inertia::render('Marketing/CommentCaMarche'))->name('marketing.how-it-works');
Route::get('/tarifs', fn () => Inertia::render('Marketing/Tarifs'))->name('marketing.pricing');
Route::get('/securite', fn () => Inertia::render('Marketing/Securite'))->name('marketing.security');

Route::middleware('auth')->group(function () {
    Route::get('/home', [WorkspaceController::class, 'redirectToDefault'])->name('home');
    Route::get('/workspaces/create', [WorkspaceController::class, 'create'])->name('workspaces.create');
    Route::post('/workspaces', [WorkspaceController::class, 'store'])->name('workspaces.store');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

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
        Route::post('/servers', [ServerController::class, 'store'])->name('servers.store');
        Route::patch('/servers/{server}', [ServerController::class, 'update'])->name('servers.update');
        Route::delete('/servers/{server}', [ServerController::class, 'destroy'])->name('servers.destroy');
        Route::post('/servers/{server}/test-connection', [ServerController::class, 'testExisting'])->name('servers.test-existing');
        Route::post('/servers/{server}/browse-directory', [ServerController::class, 'browseDirectory'])->name('servers.browse-directory');

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
            Route::post('/webhooks/{webhookConfig}/branch-mappings', [WebhookConfigController::class, 'storeBranchMapping'])->name('webhook-branch-mappings.store');
            Route::delete('/webhooks/{webhookConfig}/branch-mappings/{branchMapping}', [WebhookConfigController::class, 'destroyBranchMapping'])->name('webhook-branch-mappings.destroy');

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
    $urls = [
        ['loc' => route('welcome'), 'lastmod' => '2026-08-15', 'changefreq' => 'weekly', 'priority' => '1.0'],
        ['loc' => route('marketing.pricing'), 'lastmod' => '2026-08-15', 'changefreq' => 'weekly', 'priority' => '0.9'],
        ['loc' => route('marketing.features'), 'lastmod' => '2026-08-15', 'changefreq' => 'monthly', 'priority' => '0.8'],
        ['loc' => route('marketing.security'), 'lastmod' => '2026-08-15', 'changefreq' => 'monthly', 'priority' => '0.7'],
        ['loc' => route('marketing.how-it-works'), 'lastmod' => '2026-08-15', 'changefreq' => 'monthly', 'priority' => '0.6'],
        ['loc' => route('legal.terms'), 'lastmod' => '2026-08-12', 'changefreq' => 'monthly', 'priority' => '0.3'],
        ['loc' => route('legal.privacy'), 'lastmod' => '2026-08-12', 'changefreq' => 'monthly', 'priority' => '0.3'],
        ['loc' => route('legal.refunds'), 'lastmod' => '2026-08-12', 'changefreq' => 'monthly', 'priority' => '0.3'],
    ];

    return response()
        ->view('sitemap', ['urls' => $urls])
        ->header('Content-Type', 'application/xml');
})->name('sitemap');

require __DIR__.'/auth.php';
