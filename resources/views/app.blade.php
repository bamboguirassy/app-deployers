<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    @php
        // Inertia's `inertia`-marked default tags are only ever replaced by a
        // page's own <Head> client-side, via post-hydration DOM diffing — the
        // very first server response (exactly what crawlers/SSR see) just
        // concatenates both, which silently broke every per-page <title>/
        // description/robots/OG override in the app (duplicate <title> and
        // duplicate <meta name="robots"> — the SEO-critical case — with the
        // page's own value coming second, browsers/crawlers use whichever
        // they parse first). We suppress the relevant blade defaults
        // server-side, by route, whenever a page is known to fully own that
        // tag via its own <Head>.
        $currentRoute = Route::currentRouteName();
        $ownsFullSeoMeta = in_array($currentRoute, [
            'welcome', 'welcome.fr', 'legal.terms', 'legal.privacy', 'legal.refunds',
            'legal.terms.en', 'legal.privacy.en', 'legal.refunds.en',
            'marketing.features', 'marketing.how-it-works', 'marketing.pricing', 'marketing.security',
            'marketing.features.en', 'marketing.how-it-works.en', 'marketing.pricing.en', 'marketing.security.en',
        ]);
        $ownsTitleOnly = in_array($currentRoute, ['login', 'register']);
    @endphp
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        @unless ($ownsFullSeoMeta || $ownsTitleOnly)
            <title inertia>{{ config('app.name', 'Laravel') }} — Supervisez vos déploiements en direct</title>
        @endunless

        {{-- Default SEO meta — the app is auth-walled, so pages are noindex unless a
             page (e.g. the public Welcome landing) explicitly overrides via its own <Head>. --}}
        @unless ($ownsFullSeoMeta)
            <meta name="robots" content="noindex, nofollow">
            <meta name="description" inertia content="{{ config('app.name', 'Laravel') }} — orchestrez vos pipelines de déploiement, vos environnements et vos équipes depuis une seule plateforme.">
        @endunless
        <meta name="theme-color" content="#0f172a">
        {{-- Construit depuis APP_URL plutôt que url()->current() : force un host/schéma
             canonique unique (indépendant de X-Forwarded-* ou d'un accès direct par IP)
             et ignore la query string, pour éviter que ?utm_source=... etc. produisent
             des canonicals différents pour la même page. --}}
        <link rel="canonical" inertia href="{{ rtrim(config('app.url'), '/').request()->getPathInfo() }}">

        <!-- Open Graph / Twitter (overridable per-page via Inertia <Head>) -->
        <meta property="og:type" content="website">
        <meta property="og:site_name" content="{{ config('app.name', 'Laravel') }}">
        @unless ($ownsFullSeoMeta)
            <meta property="og:title" content="{{ config('app.name', 'Laravel') }} — Supervisez vos déploiements en direct">
            <meta property="og:description" content="Orchestrez vos pipelines de déploiement, vos environnements et vos équipes depuis une seule plateforme.">
        @endunless
        <meta property="og:url" inertia content="{{ rtrim(config('app.url'), '/').request()->getPathInfo() }}">
        <meta property="og:image" inertia content="{{ asset('logos/og-image.png') }}">
        <meta property="og:image:width" content="1200">
        <meta property="og:image:height" content="630">
        <meta name="twitter:card" content="summary_large_image">
        @unless ($ownsFullSeoMeta)
            <meta name="twitter:title" content="{{ config('app.name', 'Laravel') }} — Supervisez vos déploiements en direct">
            <meta name="twitter:description" content="Orchestrez vos pipelines de déploiement, vos environnements et vos équipes depuis une seule plateforme.">
        @endunless
        <meta name="twitter:image" inertia content="{{ asset('logos/og-image.png') }}">

        <!-- Favicons -->
        <link rel="icon" type="image/svg+xml" href="/logos/logo.svg">
        <link rel="icon" type="image/png" sizes="32x32" href="/logos/icon-32.png">
        <link rel="icon" type="image/png" sizes="16x16" href="/logos/icon-16.png">
        <link rel="apple-touch-icon" sizes="180x180" href="/logos/apple-touch-icon.png">
        <link rel="shortcut icon" href="/logos/favicon.ico">
        <link rel="manifest" href="/manifest.webmanifest">

        {{-- Organization/WebSite schema.org — présent sur toutes les pages publiques
             (contrairement au SoftwareApplication de Welcome.tsx qui décrit le produit,
             celui-ci identifie l'éditeur/le site pour les moteurs et les crawlers IA). --}}
        <script type="application/ld+json">
            {!! json_encode([
                '@context' => 'https://schema.org',
                '@graph' => [
                    [
                        '@type' => 'Organization',
                        'name' => 'App Deployer',
                        'url' => url('/'),
                        'logo' => asset('logos/icon-512.png'),
                    ],
                    [
                        '@type' => 'WebSite',
                        'name' => 'App Deployer',
                        'url' => url('/'),
                    ],
                ],
            ]) !!}
        </script>

        <!-- Fonts : chargement non-bloquant (preload + bascule en stylesheet au
             onload) plutôt qu'un <link rel="stylesheet"> classique, qui retarderait
             le premier rendu le temps de récupérer fonts.bunny.net. -->
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link
            rel="preload"
            as="style"
            href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap"
            onload="this.onload=null;this.rel='stylesheet'"
        >
        <noscript>
            <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet">
        </noscript>

        <!-- Google Analytics -->
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-5YL7YNFGES"></script>
        <script>
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-5YL7YNFGES');
        </script>

        <!-- Scripts -->
        @routes
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/Pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
