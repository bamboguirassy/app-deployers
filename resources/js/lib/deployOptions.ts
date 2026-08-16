import { Application } from '@/types/models';
import { TFunction } from 'i18next';

export interface DeployOption {
    value: string;
    label: string;
    disabled?: boolean;
    disabledReason?: string;
}

/**
 * Construit la liste des cibles de déploiement disponibles pour une
 * application : une entrée par couple target×environnement, plus une entrée
 * combinée "TargetA + TargetB → env" dès que plus d'un target est configuré
 * sur le même environnement. Une entrée dont l'environnement n'a pas encore
 * de serveur configuré est incluse mais désactivée (le pipeline ne doit
 * jamais pouvoir s'exécuter sans cible SSH — voir DeploymentService::trigger()).
 */
export function buildDeployOptions(application: Pick<Application, 'targets'>, t: TFunction): DeployOption[] {
    const noServerReason = t('common:deployOptions.noServerReason');

    const byEnvironment = new Map<
        string,
        { name: string; targets: { name: string; targetEnvironmentId: string; hasServer: boolean }[] }
    >();

    application.targets.forEach((target) => {
        target.target_environments.forEach((te) => {
            const group = byEnvironment.get(te.environment.uuid) ?? { name: te.environment.name, targets: [] };
            group.targets.push({ name: target.name, targetEnvironmentId: te.uuid, hasServer: !!te.server_id });
            byEnvironment.set(te.environment.uuid, group);
        });
    });

    const options: DeployOption[] = [];
    byEnvironment.forEach((group, environmentId) => {
        group.targets.forEach((target) =>
            options.push({
                value: `te-${target.targetEnvironmentId}`,
                label: `${target.name} → ${group.name}`,
                disabled: !target.hasServer,
                disabledReason: target.hasServer ? undefined : noServerReason,
            }),
        );

        if (group.targets.length > 1) {
            const missingServer = group.targets.some((target) => !target.hasServer);

            options.push({
                value: `env-${environmentId}`,
                label: `${group.targets.map((target) => target.name).join(' + ')} → ${group.name}`,
                disabled: missingServer,
                disabledReason: missingServer ? noServerReason : undefined,
            });
        }
    });

    return options;
}

/**
 * Construit l'URL Ziggy à appeler (POST) pour déclencher l'option choisie.
 */
export function deployOptionRoute(workspaceSlug: string, applicationSlug: string, value: string): string {
    if (value.startsWith('te-')) {
        return route('deployments.store', [workspaceSlug, applicationSlug, value.slice(3)]);
    }

    return route('deployments.store-environment', [workspaceSlug, applicationSlug, value.slice(4)]);
}
