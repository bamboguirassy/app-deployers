import { TFunction } from 'i18next';

export const STATUS_COLORS: Record<string, string> = {
    pending: 'default',
    running: 'blue',
    succes: 'green',
    echec: 'red',
    annule: 'orange',
};

const STATUS_VALUES = ['pending', 'running', 'succes', 'echec', 'annule'] as const;
const SOURCE_VALUES = ['manual', 'webhook', 'scheduled'] as const;

/**
 * Ces libellés dépendent de la locale (contrairement aux valeurs `status`/
 * `trigger_source` elles-mêmes, volontairement françaises côté données —
 * voir CLAUDE.md) — d'où des fonctions prenant `t` plutôt que des objets
 * constants, à appeler depuis un composant qui a déjà `useTranslation`.
 */
export function getStatusLabel(t: TFunction, status: string): string {
    return t(`deployments:status.${status}`, { defaultValue: status });
}

export function getSourceLabel(t: TFunction, source: string): string {
    return t(`deployments:source.${source}`, { defaultValue: source });
}

export function getStatusOptions(t: TFunction) {
    return STATUS_VALUES.map((value) => ({ value, label: getStatusLabel(t, value) }));
}

export function getSourceOptions(t: TFunction) {
    return SOURCE_VALUES.map((value) => ({ value, label: getSourceLabel(t, value) }));
}

export function formatDuration(durationMs: number | null | undefined): string {
    if (durationMs === null || durationMs === undefined) {
        return '—';
    }

    if (durationMs < 1000) {
        return `${durationMs} ms`;
    }

    return `${Math.round(durationMs / 1000)}s`;
}

export interface DeploymentKpis {
    total: number;
    running: number;
    succes: number;
    echec: number;
    success_rate: number;
    avg_duration_ms: number;
}
