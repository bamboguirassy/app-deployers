import { StatusIcon } from '@/Components/Deployments/DeploymentIcons';
import { STATUS_COLORS, getStatusLabel } from '@/constants/deployments';
import { DeploymentStatus } from '@/types/models';
import { Tag } from 'antd';
import { useTranslation } from 'react-i18next';

/**
 * Single source of truth for rendering a deployment status: icon, label and color
 * all come from constants/deployments.ts. Two visual variants:
 * - "pill" (default): icon + colored text, used in tables (Dashboard, DeploymentsList, ApplicationsList).
 * - "tag": antd colored Tag with no icon, used for header-level emphasis (Deployments/Show).
 */
export default function StatusTag({
    status,
    variant = 'pill',
    size = 14,
}: {
    status: string | DeploymentStatus;
    variant?: 'pill' | 'tag';
    size?: number;
}) {
    const { t } = useTranslation();
    const label = getStatusLabel(t, status);

    if (variant === 'tag') {
        return <Tag color={STATUS_COLORS[status] ?? 'default'}>{label}</Tag>;
    }

    return (
        <span className={`premium-table__status premium-table__status--${status}`}>
            <StatusIcon status={status} size={size} />
            {label}
        </span>
    );
}
