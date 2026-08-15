import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enCommon from './en/common.json';
import frCommon from './fr/common.json';

export type SupportedLocale = 'en' | 'fr';

const resources = {
    en: { common: enCommon },
    fr: { common: frCommon },
};

/**
 * i18next est initialisé de façon synchrone (pas de backend HTTP, dictionnaires
 * bundlés) avec la locale résolue côté serveur (middleware SetLocale, prop
 * Inertia partagée `locale`) — jamais via une détection navigateur côté
 * client, pour rester cohérent avec le HTML pré-rendu en SSR.
 */
export function initI18n(locale: SupportedLocale) {
    if (!i18n.isInitialized) {
        i18n.use(initReactI18next).init({
            resources,
            lng: locale,
            fallbackLng: 'en',
            defaultNS: 'common',
            interpolation: { escapeValue: false },
        });
    } else if (i18n.language !== locale) {
        i18n.changeLanguage(locale);
    }

    return i18n;
}

export default i18n;
