export const STATUS_COLORS: Record<string, string> = {
    pending: 'default',
    running: 'blue',
    succes: 'green',
    echec: 'red',
    annule: 'orange',
};

export const STATUS_OPTIONS = [
    { value: 'pending', label: 'En attente' },
    { value: 'running', label: 'En cours' },
    { value: 'succes', label: 'Succès' },
    { value: 'echec', label: 'Échec' },
    { value: 'annule', label: 'Annulé' },
];

export const SOURCE_OPTIONS = [
    { value: 'manual', label: 'Manuel' },
    { value: 'webhook', label: 'Webhook' },
    { value: 'scheduled', label: 'Planifié' },
];

export const SOURCE_LABELS: Record<string, string> = {
    manual: 'Manuel',
    webhook: 'Webhook',
    scheduled: 'Planifié',
};

export const STATUS_LABELS: Record<string, string> = {
    pending: 'En attente',
    running: 'En cours',
    succes: 'Succès',
    echec: 'Échec',
    annule: 'Annulé',
};

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
