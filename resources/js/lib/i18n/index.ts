import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enCommon from './en/common.json';
import enApplications from './en/applications.json';
import enDeployments from './en/deployments.json';
import enServers from './en/servers.json';
import enAdmin from './en/admin.json';
import enUsers from './en/users.json';
import enProfile from './en/profile.json';
import enWorkspaces from './en/workspaces.json';
import enBilling from './en/billing.json';
import enDashboard from './en/dashboard.json';
import frCommon from './fr/common.json';
import frApplications from './fr/applications.json';
import frDeployments from './fr/deployments.json';
import frServers from './fr/servers.json';
import frAdmin from './fr/admin.json';
import frUsers from './fr/users.json';
import frProfile from './fr/profile.json';
import frWorkspaces from './fr/workspaces.json';
import frBilling from './fr/billing.json';
import frDashboard from './fr/dashboard.json';

export type SupportedLocale = 'en' | 'fr';

const resources = {
    en: {
        common: enCommon,
        applications: enApplications,
        deployments: enDeployments,
        servers: enServers,
        admin: enAdmin,
        users: enUsers,
        profile: enProfile,
        workspaces: enWorkspaces,
        billing: enBilling,
        dashboard: enDashboard,
    },
    fr: {
        common: frCommon,
        applications: frApplications,
        deployments: frDeployments,
        servers: frServers,
        admin: frAdmin,
        users: frUsers,
        profile: frProfile,
        workspaces: frWorkspaces,
        billing: frBilling,
        dashboard: frDashboard,
    },
};

/**
 * i18next est initialisé de façon synchrone (pas de backend HTTP, dictionnaires
 * bundlés) avec la locale résolue côté serveur (middleware SetLocale, prop
 * Inertia partagée `locale`) — jamais via une détection navigateur côté
 * client, pour rester cohérent avec le HTML pré-rendu en SSR. Les navigations
 * Inertia ultérieures resynchronisent la langue via LocaleSync (voir
 * ./LocaleSync.tsx), pas via ce fichier.
 */
/**
 * `Intl`/`Date#toLocaleDateString` locale à utiliser pour le formatage de
 * dates, dérivée de la langue i18next active — jamais une valeur codée en
 * dur ('fr-FR'), sinon un visiteur anglophone voit des dates au format
 * français quelle que soit la langue affichée par ailleurs.
 */
export function dateLocale(language: string): string {
    return language === 'en' ? 'en-US' : 'fr-FR';
}

export function initI18n(locale: SupportedLocale) {
    if (!i18n.isInitialized) {
        i18n.use(initReactI18next).init({
            resources,
            lng: locale,
            fallbackLng: 'en',
            defaultNS: 'common',
            ns: [
                'common',
                'applications',
                'deployments',
                'servers',
                'admin',
                'users',
                'profile',
                'workspaces',
                'billing',
                'dashboard',
            ],
            interpolation: { escapeValue: false },
        });
    } else if (i18n.language !== locale) {
        i18n.changeLanguage(locale);
    }

    return i18n;
}

export default i18n;
