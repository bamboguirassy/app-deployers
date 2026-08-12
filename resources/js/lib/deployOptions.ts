import { Application } from '@/types/models';

export interface DeployOption {
    value: string;
    label: string;
    disabled?: boolean;
    disabledReason?: string;
}

const NO_SERVER_REASON = 'Configurez un serveur pour cet environnement avant de déployer.';

/**
 * Construit la liste des cibles de déploiement disponibles pour une
 * application : une entrée par couple target×environnement, plus une entrée
 * combinée "TargetA + TargetB → env" dès que plus d'un target est configuré
 * sur le même environnement. Une entrée dont l'environnement n'a pas encore
 * de serveur configuré est incluse mais désactivée (le pipeline ne doit
 * jamais pouvoir s'exécuter sans cible SSH — voir DeploymentService::trigger()).
 */
export function buildDeployOptions(application: Pick<Application, 'targets'>): DeployOption[] {
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
        group.targets.forEach((t) =>
            options.push({
                value: `te-${t.targetEnvironmentId}`,
                label: `${t.name} → ${group.name}`,
                disabled: !t.hasServer,
                disabledReason: t.hasServer ? undefined : NO_SERVER_REASON,
            }),
        );

        if (group.targets.length > 1) {
            const missingServer = group.targets.some((t) => !t.hasServer);

            options.push({
                value: `env-${environmentId}`,
                label: `${group.targets.map((t) => t.name).join(' + ')} → ${group.name}`,
                disabled: missingServer,
                disabledReason: missingServer ? NO_SERVER_REASON : undefined,
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
