import { TFunction } from 'i18next';

/**
 * Le texte dépend de la locale (contrairement à un simple calcul de durée),
 * d'où une fonction prenant `t` plutôt qu'un formatage codé en dur — à
 * appeler depuis un composant qui a déjà `useTranslation`.
 */
export function timeAgo(date: string, t: TFunction): string {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);

    if (seconds < 60) {
        return t('common:time.justNow');
    }

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
        return t('common:time.minutesAgo', { count: minutes });
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
        return t('common:time.hoursAgo', { count: hours });
    }

    const days = Math.floor(hours / 24);
    return t('common:time.daysAgo', { count: days });
}
