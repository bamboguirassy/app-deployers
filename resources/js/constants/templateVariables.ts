import { TFunction } from 'i18next';

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

const VARIABLE_PATHS = [
    'application.name',
    'environment.name',
    'target.name',
    'deployment.status',
    'deployment.trigger_source',
    'deployment.triggered_by',
    'deployment.branch',
    'deployment.commit_sha',
    'deployment.started_at',
    'step.label',
] as const;

const SAMPLES: Record<(typeof VARIABLE_PATHS)[number], string> = {
    'application.name': 'Mon Application',
    'environment.name': 'production',
    'target.name': 'API',
    'deployment.status': 'succes',
    'deployment.trigger_source': 'manual',
    'deployment.triggered_by': 'Jean Dupont',
    'deployment.branch': 'main',
    'deployment.commit_sha': 'a1b2c3d',
    'deployment.started_at': '09/08/2026 18:00',
    'step.label': 'Déploiement API',
};

/**
 * Le libellé de chaque variable dépend de la locale — d'où une fonction
 * prenant `t` plutôt qu'un tableau constant, à appeler depuis un composant
 * qui a déjà `useTranslation`.
 */
export function getTemplateVariables(t: TFunction): TemplateVariable[] {
    return VARIABLE_PATHS.map((path) => ({
        path,
        label: t(`applications:pipelineSteps.templateVariables.${path}`),
        sample: SAMPLES[path],
    }));
}

/**
 * Interpolation client-side utilisée uniquement pour la prévisualisation du
 * formulaire — l'interpolation qui compte réellement à l'exécution est
 * App\Support\TemplateInterpolator (côté serveur). Même syntaxe `{{a.b}}`,
 * simple substitution de chaîne, pas de moteur exécutable.
 */
export function interpolatePreview(template: string): string {
    return template.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_, path) => SAMPLES[path as keyof typeof SAMPLES] ?? '');
}
