/**
 * Variables disponibles dans les champs personnalisables d'un step (ex:
 * objet/corps d'un step "email"), sous la forme `{{chemin.imbrique}}`.
 * Doit rester synchronisé avec App\Support\DeploymentContextBuilder::build().
 */
export interface TemplateVariable {
    path: string;
    label: string;
    sample: string;
}

export const TEMPLATE_VARIABLES: TemplateVariable[] = [
    { path: 'application.name', label: "Nom de l'application", sample: 'Mon Application' },
    { path: 'environment.name', label: "Nom de l'environnement", sample: 'production' },
    { path: 'target.name', label: 'Nom du target', sample: 'API' },
    { path: 'deployment.status', label: 'Statut du déploiement', sample: 'succes' },
    { path: 'deployment.trigger_source', label: 'Origine du déclenchement', sample: 'manual' },
    { path: 'deployment.triggered_by', label: "Déclenché par", sample: 'Jean Dupont' },
    { path: 'deployment.branch', label: 'Branche git', sample: 'main' },
    { path: 'deployment.commit_sha', label: 'Commit', sample: 'a1b2c3d' },
    { path: 'deployment.started_at', label: 'Heure de démarrage', sample: '09/08/2026 18:00' },
    { path: 'step.label', label: "Nom de l'étape", sample: 'Déploiement API' },
];

const SAMPLE_CONTEXT: Record<string, string> = Object.fromEntries(
    TEMPLATE_VARIABLES.map((v) => [v.path, v.sample]),
);

/**
 * Interpolation client-side utilisée uniquement pour la prévisualisation du
 * formulaire — l'interpolation qui compte réellement à l'exécution est
 * App\Support\TemplateInterpolator (côté serveur). Même syntaxe `{{a.b}}`,
 * simple substitution de chaîne, pas de moteur exécutable.
 */
export function interpolatePreview(template: string): string {
    return template.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_, path) => SAMPLE_CONTEXT[path] ?? '');
}
