<!DOCTYPE html>
<html lang="fr">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="robots" content="noindex, nofollow">
        <title>@yield('title') - {{ config('app.name', 'App Deployer') }}</title>
        <link rel="icon" type="image/svg+xml" href="/logos/logo.svg">
        <style>
            :root {
                color-scheme: light dark;
                --color-bg: #f5f6f8;
                --color-surface: #ffffff;
                --color-border: #e3e6ea;
                --color-text: #1a1f27;
                --color-text-muted: #6b7280;
                --color-primary: #4f46e5;
            }

            @media (prefers-color-scheme: dark) {
                :root {
                    --color-bg: #12141b;
                    --color-surface: #191b23;
                    --color-border: #262a35;
                    --color-text: #eef0f5;
                    --color-text-muted: #9aa2b1;
                    --color-primary: #6d5ef8;
                }
            }

            * {
                box-sizing: border-box;
            }

            body {
                margin: 0;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                background: var(--color-bg);
                color: var(--color-text);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Figtree, sans-serif;
                text-align: center;
                padding: 24px;
            }

            .error-card {
                max-width: 460px;
                background: var(--color-surface);
                border: 1px solid var(--color-border);
                border-radius: 16px;
                padding: 40px 32px;
                box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.06);
            }

            .error-card img {
                width: 48px;
                height: 48px;
                border-radius: 12px;
                margin-bottom: 20px;
            }

            .error-card h1 {
                font-size: 15px;
                font-weight: 600;
                letter-spacing: 0.02em;
                text-transform: uppercase;
                color: var(--color-primary);
                margin: 0 0 8px;
            }

            .error-card p {
                margin: 0 0 24px;
                color: var(--color-text-muted);
                line-height: 1.5;
            }

            .error-card a {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                background: var(--color-primary);
                color: #fff;
                text-decoration: none;
                font-weight: 500;
                font-size: 14px;
                padding: 10px 20px;
                border-radius: 10px;
            }
        </style>
    </head>
    <body>
        <div class="error-card">
            <img src="/logos/logo.svg" alt="">
            <h1>@yield('title')</h1>
            <p>@yield('message')</p>
            <a href="/">Retour à l'accueil</a>
        </div>
    </body>
</html>
