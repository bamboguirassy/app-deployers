import { CommandStepConfig, EmailStepConfig, PipelineStep, StepType } from '@/types/models';
import { Mail, Terminal } from 'lucide-react';
import { ReactNode } from 'react';

export const STEP_TYPE_LABELS: Record<StepType, string> = {
    command: 'Commande shell',
    email: 'Email',
};

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

export const STEP_TYPE_OPTIONS: { value: StepType; label: string; icon: ReactNode }[] = [
    { value: 'command', label: STEP_TYPE_LABELS.command, icon: stepTypeIcon('command') },
    { value: 'email', label: STEP_TYPE_LABELS.email, icon: stepTypeIcon('email') },
];

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
export function stepSummary(step: Pick<PipelineStep, 'type' | 'config'>): string {
    if (step.type === 'command') {
        const config = step.config as CommandStepConfig;

        return config.command || '(commande vide)';
    }

    const config = step.config as EmailStepConfig;
    const to = config.to?.length ? config.to.join(', ') : '(aucun destinataire)';
    const subject = config.subject || '(sans objet)';

    return `À : ${to} — ${subject}`;
}
