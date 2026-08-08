import { DeploymentStepStatus } from '@/types/models';
import { CheckCircle2, CircleDashed, Loader2, MinusCircle, XCircle } from 'lucide-react';

const COLORS: Record<DeploymentStepStatus, string> = {
    pending: 'var(--color-text-muted)',
    running: 'var(--color-primary)',
    succes: 'var(--color-success)',
    echec: 'var(--color-danger)',
    annule: 'var(--color-warning)',
    skipped: 'var(--color-text-muted)',
};

export default function StepStatusIcon({ status }: { status: DeploymentStepStatus }) {
    const color = COLORS[status];
    const size = 16;

    if (status === 'running') {
        return <Loader2 size={size} color={color} className="spin" />;
    }

    if (status === 'succes') {
        return <CheckCircle2 size={size} color={color} />;
    }

    if (status === 'echec') {
        return <XCircle size={size} color={color} />;
    }

    if (status === 'annule') {
        return <MinusCircle size={size} color={color} />;
    }

    return <CircleDashed size={size} color={color} />;
}
