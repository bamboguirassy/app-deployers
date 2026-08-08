import StepStatusIcon from '@/Components/Deployments/StepStatusIcon';
import StatusTag from '@/Components/StatusTag';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { formatDuration } from '@/constants/deployments';
import { useConfirm } from '@/theme/ConfirmContext';
import { PageProps } from '@/types';
import { Application, Deployment, DeploymentStep } from '@/types/models';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEcho } from '@laravel/echo-react';
import { Button, Typography } from 'antd';
import { ChevronLeft, Square } from 'lucide-react';
import { useState } from 'react';

const { Title, Text } = Typography;

export default function Show({
    application,
    deployment: initialDeployment,
}: {
    application: Application;
    deployment: Deployment;
}) {
    const { workspace } = usePage<PageProps>().props;
    const [deployment, setDeployment] = useState(initialDeployment);
    const [steps, setSteps] = useState(initialDeployment.steps);
    const confirm = useConfirm();

    useEcho(
        `application.${application.id}`,
        '.deploiement.statut',
        (payload: { deployment_id: number; statut: Deployment['status']; duration_ms: number | null }) => {
            if (payload.deployment_id !== deployment.id) return;
            setDeployment((prev) => ({ ...prev, status: payload.statut, duration_ms: payload.duration_ms }));
        },
        [deployment.id],
    );

    useEcho(
        `application.${application.id}`,
        '.deploiement.etape',
        (payload: {
            deployment_id: number;
            step_id: number;
            statut: DeploymentStep['status'];
            exit_code: number | null;
            duration_ms: number | null;
            error_excerpt: string | null;
        }) => {
            if (payload.deployment_id !== deployment.id) return;

            setSteps((prev) =>
                prev.map((step) =>
                    step.id === payload.step_id
                        ? {
                              ...step,
                              status: payload.statut,
                              exit_code: payload.exit_code,
                              duration_ms: payload.duration_ms,
                              output: payload.error_excerpt ?? step.output,
                          }
                        : step,
                ),
            );
        },
        [deployment.id],
    );

    const target = deployment.target_environment.target;
    const environment = deployment.target_environment.environment;
    const isActive = deployment.status === 'pending' || deployment.status === 'running';

    const cancel = () => {
        confirm.confirm({
            title: 'Annuler ce déploiement ?',
            content: "L'étape en cours sera arrêtée et les suivantes ne s'exécuteront pas.",
            okText: 'Annuler le déploiement',
            okType: 'danger',
            cancelText: 'Fermer',
            onOk: () => router.post(route('deployments.cancel', [workspace!.slug, application.slug, deployment.id])),
        });
    };

    return (
        <AuthenticatedLayout header="Déploiement">
            <Head title={`Déploiement #${deployment.id}`} />

            <Link href={route('deployments.index', [workspace!.slug, application.slug])} className="form-link">
                <ChevronLeft size={14} style={{ verticalAlign: 'middle' }} /> Historique des déploiements
            </Link>

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
                        branche {deployment.branch ?? target.name} ·{' '}
                        {deployment.trigger_source === 'manual' ? 'déclenché manuellement' : 'déclenché par webhook'}
                        {deployment.triggered_by ? ` par ${deployment.triggered_by.name}` : ''}
                    </Text>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <StatusTag status={deployment.status} variant="tag" />
                    {isActive && (
                        <Button danger size="small" icon={<Square size={14} />} onClick={cancel}>
                            Annuler
                        </Button>
                    )}
                </div>
            </div>

            <div className="app-modal-panel" style={{ padding: 16, borderRadius: 10 }}>
                {steps.map((step, index) => (
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

                        {step.status === 'echec' && step.output && (
                            <div className="deployment-step-error">{step.output}</div>
                        )}
                    </div>
                ))}
            </div>
        </AuthenticatedLayout>
    );
}
