import { CommandStepConfig, EmailStepConfig, PipelineStep, StepType } from '@/types/models';
import { TFunction } from 'i18next';
import { Mail, Terminal } from 'lucide-react';
import { ReactNode } from 'react';

export const STEP_TYPE_COLORS: Record<StepType, string> = {
    command: 'blue',
    email: 'purple',
};

export function stepTypeIcon(type: StepType, size = 14): ReactNode {
    switch (type) {
        case 'command':
            return <Terminal size={size} />;
        case 'email':
            return <Mail size={size} />;
    }
}

/**
 * Le libellé de chaque type d'étape dépend de la locale — d'où des fonctions
 * prenant `t` plutôt que des objets constants, à appeler depuis un composant
 * qui a déjà `useTranslation`.
 */
export function getStepTypeLabel(t: TFunction, type: StepType): string {
    return t(`applications:pipelineSteps.stepTypes.${type}`);
}

export function getStepTypeOptions(t: TFunction): { value: StepType; label: string; icon: ReactNode }[] {
    return (['command', 'email'] as const).map((value) => ({
        value,
        label: getStepTypeLabel(t, value),
        icon: stepTypeIcon(value),
    }));
}

export function defaultConfigFor(type: StepType): CommandStepConfig | EmailStepConfig {
    switch (type) {
        case 'command':
            return { command: '' };
        case 'email':
            return { to: [], subject: '', body: '' };
    }
}

/**
 * Résumé court affiché dans la liste des steps — doit rester cohérent avec
 * ce que chaque StepAction backend est capable d'exécuter (App\StepActions\*).
 */
export function stepSummary(step: Pick<PipelineStep, 'type' | 'config'>, t: TFunction): string {
    if (step.type === 'command') {
        const config = step.config as CommandStepConfig;

        return config.command || t('applications:pipelineSteps.emptyCommand');
    }

    const config = step.config as EmailStepConfig;
    const to = config.to?.length ? config.to.join(', ') : t('applications:pipelineSteps.noRecipient');
    const subject = config.subject || t('applications:pipelineSteps.noSubject');

    return t('applications:pipelineSteps.emailSummary', { to, subject });
}
