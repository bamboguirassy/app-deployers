<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <title inertia>{{ config('app.name', 'Laravel') }}</title>

        {{-- Default SEO meta — the app is auth-walled, so pages are noindex unless a
             page (e.g. the public Welcome landing) explicitly overrides via its own <Head>. --}}
        <meta name="robots" content="noindex, nofollow">
        <meta name="description" inertia content="{{ config('app.name', 'Laravel') }} — orchestrez vos pipelines de déploiement, vos environnements et vos équipes depuis une seule plateforme.">
        <meta name="theme-color" content="#0f172a">
        <link rel="canonical" inertia href="{{ url()->current() }}">

        <!-- Open Graph / Twitter (overridable per-page via Inertia <Head>) -->
        <meta property="og:type" content="website">
        <meta property="og:site_name" content="{{ config('app.name', 'Laravel') }}">
        <meta property="og:title" inertia content="{{ config('app.name', 'Laravel') }}">
        <meta property="og:description" inertia content="Orchestrez vos pipelines de déploiement, vos environnements et vos équipes depuis une seule plateforme.">
        <meta property="og:url" inertia content="{{ url()->current() }}">
        <meta property="og:image" inertia content="{{ asset('logos/og-image.png') }}">
        <meta property="og:image:width" content="1200">
        <meta property="og:image:height" content="630">
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" inertia content="{{ config('app.name', 'Laravel') }}">
        <meta name="twitter:description" inertia content="Orchestrez vos pipelines de déploiement, vos environnements et vos équipes depuis une seule plateforme.">
        <meta name="twitter:image" inertia content="{{ asset('logos/og-image.png') }}">

        <!-- Favicons -->
        <link rel="icon" type="image/svg+xml" href="/logos/logo.svg">
        <link rel="icon" type="image/png" sizes="32x32" href="/logos/icon-32.png">
        <link rel="icon" type="image/png" sizes="16x16" href="/logos/icon-16.png">
        <link rel="apple-touch-icon" sizes="180x180" href="/logos/apple-touch-icon.png">
        <link rel="shortcut icon" href="/logos/favicon.ico">

        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet" />

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
