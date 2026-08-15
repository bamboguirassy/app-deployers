import StepStatusIcon from '@/Components/Deployments/StepStatusIcon';
import StatusTag from '@/Components/StatusTag';
import AdminLayout from '@/Layouts/AdminLayout';
import { formatDuration } from '@/constants/deployments';
import { Deployment } from '@/types/models';
import { Head } from '@inertiajs/react';
import { Space, Typography } from 'antd';
import { Boxes, Building2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { dateLocale } from '@/lib/i18n';

const { Title, Text } = Typography;

interface AdminDeployment extends Deployment {
    target_environment: Deployment['target_environment'] & {
        target: Deployment['target_environment']['target'] & {
            application?: {
                id: number;
                name: string;
                slug: string;
                workspace?: { id: number; name: string; slug: string } | null;
            } | null;
        };
    };
}

/**
 * Vue de détail d'un déploiement pour le super-admin — strictement lecture
 * seule : pas de bouton d'annulation, pas d'écoute Echo temps réel (le
 * super-admin n'est pas nécessairement abonné au channel privé
 * `application.{id}` de ce workspace). Sert uniquement à investiguer une
 * erreur repérée depuis /admin/deployments.
 */
export default function Show({ deployment }: { deployment: AdminDeployment }) {
    const { t, i18n } = useTranslation('admin');
    const target = deployment.target_environment.target;
    const environment = deployment.target_environment.environment;
    const application = target.application;

    return (
        <AdminLayout
            breadcrumbs={[
                { label: t('layout.breadcrumbFallback'), href: route('admin.dashboard') },
                { label: t('layout.nav.deployments'), href: route('admin.deployments.index') },
                { label: t('deploymentsShow.breadcrumbTitle', { id: deployment.id }) },
            ]}
        >
            <Head title={t('deploymentsShow.headTitle', { id: deployment.id })} />

            <Space size={16} wrap style={{ marginBottom: 8 }}>
                <span className="form-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Building2 size={14} /> {application?.workspace?.name ?? '—'}
                </span>
                <span className="form-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Boxes size={14} /> {application?.name ?? '—'}
                </span>
            </Space>

            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    margin: '12px 0 24px',
                }}
            >
                <div>
                    <Title level={4} style={{ margin: 0 }}>
                        {target.name} → {environment.name}
                    </Title>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                        {t('deploymentsShow.branch', { branch: deployment.branch ?? target.name })} ·{' '}
                        {deployment.trigger_source === 'manual' ? t('deploymentsShow.manualTrigger') : t('deploymentsShow.webhookTrigger')}
                        {deployment.triggered_by ? t('deploymentsShow.triggeredBy', { name: deployment.triggered_by.name }) : ''} ·{' '}
                        {new Date(deployment.created_at).toLocaleString(dateLocale(i18n.language))}
                    </Text>
                </div>

                <StatusTag status={deployment.status} variant="tag" />
            </div>

            <div className="app-modal-panel" style={{ padding: 16, borderRadius: 10 }}>
                {deployment.steps.map((step, index) => (
                    <div key={step.id}>
                        <div className={`deployment-step-row ${step.status === 'running' ? 'deployment-step-row--running' : ''}`}>
                            <StepStatusIcon status={step.status} />
                            <span className="step-ordinal">{index + 1}</span>
                            <Text strong style={{ flex: 1 }}>
                                {step.label_snapshot}
                            </Text>
                            {step.duration_ms !== null && (
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    {formatDuration(step.duration_ms)}
                                </Text>
                            )}
                        </div>

                        {step.output && (
                            <div className={`deployment-step-output ${step.status === 'echec' ? 'deployment-step-output--error' : ''}`}>
                                {step.output}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </AdminLayout>
    );
}
