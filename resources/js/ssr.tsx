import '../css/app.css';
import '../sass/app.scss';

import { createInertiaApp } from '@inertiajs/react';
import createServer from '@inertiajs/react/server';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import ReactDOMServer from 'react-dom/server';
import { route } from 'ziggy-js';
import { Ziggy } from './ziggy';
import { AppThemeProvider } from './theme/AppThemeProvider';
import { initI18n, SupportedLocale } from './lib/i18n';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

// Port d'écoute du serveur Node : piloté par INERTIA_SSR_PORT (process env, ex:
// défini dans le bloc `environment=` du superviseur), pas par INERTIA_SSR_URL —
// cette dernière ne sert qu'au client PHP pour savoir où appeler. Les deux
// valeurs doivent rester cohérentes. Défaut 13714 si non défini.
const ssrPort = Number(process.env.INERTIA_SSR_PORT) || 13714;

createServer((page) => {
    // Le helper `route()` est normalement injecté globalement côté client par
    // la directive Blade `@routes` (script inline) — absente ici puisque le
    // rendu SSR ne passe jamais par app.blade.php. On le reconstruit depuis
    // la config Ziggy générée (`php artisan ziggy:generate`) pour que les
    // pages appelant `route(...)` pendant le rendu ne plantent pas le worker Node.
    // @ts-expect-error route() is expected as an untyped global by pages
    global.route = (name, params, absolute) => route(name, params, absolute, Ziggy);

    // La locale doit venir de la prop Inertia partagée par cette requête
    // précise (middleware SetLocale côté PHP), jamais d'une détection
    // navigateur : le HTML pré-rendu ici doit matcher exactement ce que le
    // client réhydrate avec la même prop.
    initI18n((page.props.locale as SupportedLocale) ?? 'en');

    return createInertiaApp({
        page,
        render: ReactDOMServer.renderToString,
        title: (title) => `${title} - ${appName}`,
        resolve: (name) =>
            resolvePageComponent(
                `./Pages/${name}.tsx`,
                import.meta.glob('./Pages/**/*.tsx'),
            ),
        setup: ({ App, props }) => (
            <AppThemeProvider>
                <App {...props} />
            </AppThemeProvider>
        ),
    });
}, ssrPort);
