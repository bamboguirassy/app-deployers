import { router } from '@inertiajs/react';
import i18n, { SupportedLocale } from '.';

/**
 * `initI18n` n'est appelé qu'une fois, au montage initial de l'app (voir
 * app.tsx/ssr.tsx) — sans ceci, une navigation Inertia côté client vers une
 * page dont la locale résolue diffère de celle du premier montage (ex: page
 * marketing FR fixe puis dashboard résolu EN via cookie) ne mettrait jamais
 * à jour la langue affichée.
 *
 * Implémenté via l'API d'événements globale du router Inertia plutôt qu'un
 * composant + usePage() : ce dernier doit être un DESCENDANT du composant
 * <App> fourni par createInertiaApp (c'est <App> qui établit le contexte
 * Inertia), alors qu'ici on doit envelopper <App> lui-même dans app.tsx —
 * usePage() y lèverait "usePage must be used within the Inertia component".
 * router.on('navigate') ne dépend d'aucun contexte React.
 */
export function watchLocaleOnNavigate() {
    router.on('navigate', (event) => {
        const locale = event.detail.page.props.locale as SupportedLocale | undefined;

        if (locale && i18n.language !== locale) {
            i18n.changeLanguage(locale);
        }
    });
}
