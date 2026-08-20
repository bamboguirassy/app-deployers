import '../css/app.css';
import '../sass/app.scss';
import './bootstrap';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { configureEcho } from '@laravel/echo-react';
import { AppThemeProvider } from './theme/AppThemeProvider';
import { initI18n, SupportedLocale } from './lib/i18n';
import { watchLocaleOnNavigate } from './lib/i18n/LocaleSync';

watchLocaleOnNavigate();

// Envoie une pageview GA à chaque navigation Inertia (SPA)
import { router } from '@inertiajs/react';
router.on('navigate', () => {
    if (typeof window.gtag === 'function') {
        window.gtag('event', 'page_view', {
            page_path: window.location.pathname + window.location.search,
        });
    }
});

configureEcho({
    broadcaster: 'reverb',
});

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.tsx`,
            import.meta.glob('./Pages/**/*.tsx'),
        ),
    setup({ el, App, props }) {
        const locale = (props.initialPage.props.locale as SupportedLocale) ?? 'en';
        initI18n(locale);

        const root = createRoot(el);

        root.render(
            <AppThemeProvider>
                <App {...props} />
            </AppThemeProvider>,
        );
    },
    progress: {
        color: '#4B5563',
    },
});
