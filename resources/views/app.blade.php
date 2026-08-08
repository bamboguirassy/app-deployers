<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <title inertia>{{ config('app.name', 'Laravel') }}</title>

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
