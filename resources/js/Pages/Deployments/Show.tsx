import StepStatusIcon from '@/Components/Deployments/StepStatusIcon';
import StatusTag from '@/Components/StatusTag';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { formatDuration, getStatusLabel } from '@/constants/deployments';
import { stepTypeIcon } from '@/constants/stepTypes';
import { useConfirm } from '@/theme/ConfirmContext';
import { PageProps } from '@/types';
import { Application, Deployment, DeploymentStep } from '@/types/models';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEcho } from '@laravel/echo-react';
import { Button, Space, Tooltip, Typography } from 'antd';
import { Boxes, ChevronLeft, ChevronsUpDown, History, Pencil, RotateCcw, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;

export default function Show({
    application,
    deployment: initialDeployment,
}: {
    application: Application;
    deployment: Deployment;
}) {
    const { workspace } = usePage<PageProps>().props;
    const { t } = useTranslation('deployments');
    const [deployment, setDeployment] = useState(initialDeployment);
    const [steps, setSteps] = useState(initialDeployment.steps);
    const [expandedSteps, setExpandedSteps] = useState<Set<number>>(
        () => new Set(initialDeployment.steps.filter((s) => s.status === 'echec').map((s) => s.id)),
    );
    const [retrying, setRetrying] = useState(false);
    const [rollingBack, setRollingBack] = useState(false);
    const [liveOutput, setLiveOutput] = useState<Record<number, string>>({});
    const liveOutputRef = useRef<Record<number, string>>({});
    const liveOutputEls = useRef<Record<number, HTMLDivElement | null>>({});
    const confirm = useConfirm();

    useEffect(() => {
        liveOutputRef.current = liveOutput;

        // Auto-scroll : fait suivre le bas du flux à chaque nouveau morceau reçu,
        // comme un terminal — l'utilisateur n'a jamais à scroller manuellement
        // pour voir la dernière ligne.
        Object.keys(liveOutput).forEach((stepId) => {
            const el = liveOutputEls.current[Number(stepId)];
            if (el) el.scrollTop = el.scrollHeight;
        });
    }, [liveOutput]);

    const toggleStepOutput = (stepId: number) => {
        setExpandedSteps((prev) => {
            const next = new Set(prev);
            if (next.has(stepId)) {
                next.delete(stepId);
            } else {
                next.add(stepId);
            }
            return next;
        });
    };

    useEcho(
        `application.${application.id}`,
        '.deploiement.statut',
        (payload: { deployment_id: number; statut: Deployment['status']; duration_ms: number | null }) => {
            if (payload.deployment_id !== deployment.id) return;
            setDeployment((prev) => ({ ...prev, status: payload.statut, duration_ms: payload.duration_ms }));
        },
        [deployment.uuid],
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

            // La sortie live accumulée pour ce step (si il en a produit) devient
            // sa sortie finale tant que le job n'a pas broadcasté error_excerpt —
            // sans ça, un step réussi affichait `output: null` et la card live
            // disparaissait sans jamais laisser de trace consultable.
            const accumulated = liveOutputRef.current[payload.step_id];

            setSteps((prev) =>
                prev.map((step) =>
                    step.id === payload.step_id
                        ? {
                              ...step,
                              status: payload.statut,
                              exit_code: payload.exit_code,
                              duration_ms: payload.duration_ms,
                              output: payload.error_excerpt ?? accumulated ?? step.output,
                          }
                        : step,
                ),
            );

            if (payload.error_excerpt || accumulated) {
                setExpandedSteps((prev) => new Set(prev).add(payload.step_id));
            }

            setLiveOutput((prev) => {
                if (!(payload.step_id in prev)) return prev;
                const next = { ...prev };
                delete next[payload.step_id];
                return next;
            });
        },
        [deployment.uuid],
    );

    useEcho(
        `application.${application.id}`,
        '.deploiement.sortie',
        (payload: { deployment_id: number; step_id: number; chunk: string }) => {
            if (payload.deployment_id !== deployment.id) return;

            setLiveOutput((prev) => ({
                ...prev,
                [payload.step_id]: (prev[payload.step_id] ?? '') + payload.chunk,
            }));
        },
        [deployment.uuid],
    );

    const target = deployment.target_environment.target;
    const environment = deployment.target_environment.environment;
    const isActive = deployment.status === 'pending' || deployment.status === 'running';

    const canRetry = deployment.status === 'echec' || deployment.status === 'annule';
    const canRollback = deployment.status === 'succes';

    const cancel = () => {
        confirm.confirm({
            title: t('show.cancel.confirmTitle'),
            content: t('show.cancel.confirmContent'),
            okText: t('show.cancel.okText'),
            okType: 'danger',
            cancelText: t('show.cancel.cancelText'),
            onOk: () => router.post(route('deployments.cancel', [workspace!.slug, application.slug, deployment.uuid])),
        });
    };

    const retry = () => {
        confirm.confirm({
            title: t('show.retry.confirmTitle'),
            content: t('show.retry.confirmContent', { target: target.name, environment: environment.name }),
            okText: t('show.retry.okText'),
            cancelText: t('show.retry.cancelText'),
            onOk: () => {
                setRetrying(true);
                router.post(route('deployments.retry', [workspace!.slug, application.slug, deployment.uuid]), {}, {
                    onFinish: () => setRetrying(false),
                });
            },
        });
    };

    const rollback = () => {
        confirm.confirm({
            title: t('show.rollback.confirmTitle'),
            content: t('show.rollback.confirmContent', { target: target.name, environment: environment.name }),
            okText: t('show.rollback.okText'),
            cancelText: t('show.rollback.cancelText'),
            onOk: () => {
                setRollingBack(true);
                router.post(route('deployments.rollback', [workspace!.slug, application.slug, deployment.uuid]), {}, {
                    onFinish: () => setRollingBack(false),
                });
            },
        });
    };

    return (
        <AuthenticatedLayout header={t('show.header')}>
            <Head title={t('show.pageTitle', { id: deployment.id })} />

            <Space size={8} wrap className="deployment-breadcrumbs" aria-label={t('show.nav.label')}>
                <Link href={route('deployments.index', [workspace!.slug, application.slug])} className="deployment-nav-link deployment-nav-link--back">
                    <ChevronLeft size={15} /> <span>{t('show.nav.history')}</span>
                </Link>
                <Link href={route('applications.show', [workspace!.slug, application.slug])} className="deployment-nav-link">
                    <Boxes size={15} /> <span>{t('show.nav.viewApplication')}</span>
                </Link>
                <Link
                    href={`${route('applications.show', [workspace!.slug, application.slug])}?tab=targets&target=${target.uuid}`}
                    className="deployment-nav-link deployment-nav-link--config"
                >
                    <Pencil size={15} /> <span>{t('show.nav.editPipeline')}</span>
                </Link>
            </Space>

            <section className="deployment-hero" aria-labelledby="deployment-title">
                <div className="deployment-hero__heading">
                    <div>
                        <span className="deployment-eyebrow">{t('show.eyebrow', { id: deployment.id })}</span>
                        <Title id="deployment-title" level={2} className="deployment-hero__title">
                            {target.name} <span aria-hidden="true">→</span> {environment.name}
                        </Title>
                        <Text type="secondary" className="deployment-hero__meta">
                            {t('show.branch')} <strong>{deployment.branch ?? target.name}</strong> ·{' '}
                            {deployment.trigger_source === 'manual' ? t('show.triggeredManually') : t('show.triggeredByWebhook')}
                            {deployment.triggered_by ? ` ${t('show.triggeredBy', { name: deployment.triggered_by.name })}` : ''}
                        </Text>
                    </div>

                    <div className="deployment-hero__actions" aria-label={t('show.actionsLabel')}>
                    <div className="deployment-hero__status"><span className="deployment-action-label">{t('show.currentStatus')}</span><StatusTag status={deployment.status} variant="tag" /></div>
                    {isActive && (
                        <Tooltip title={t('show.cancel.tooltip')}>
                            <Button className="deployment-action deployment-action--danger" danger size="middle" icon={<Square size={14} />} onClick={cancel} aria-label={t('show.cancel.ariaLabel')}>
                                {t('show.cancel.button')}
                            </Button>
                        </Tooltip>
                    )}
                    {canRetry && (
                        <Tooltip title={t('show.retry.tooltip')}>
                            <Button
                                className="deployment-action deployment-action--secondary"
                                size="middle"
                                icon={<RotateCcw size={14} />}
                                loading={retrying}
                                onClick={retry}
                                aria-label={t('show.retry.ariaLabel')}
                            >
                                {t('show.retry.button')}
                            </Button>
                        </Tooltip>
                    )}
                    {canRollback && (
                        <Tooltip title={t('show.rollback.tooltip')}>
                            <Button
                                className="deployment-action deployment-action--primary"
                                size="middle"
                                icon={<History size={14} />}
                                loading={rollingBack}
                                onClick={rollback}
                                aria-label={t('show.rollback.ariaLabel')}
                            >
                                {t('show.rollback.button')}
                            </Button>
                        </Tooltip>
                    )}
                </div>
                </div>
                <div className="deployment-summary" aria-label={t('show.summary.pipeline')}>
                    <div><span>{t('show.summary.pipeline')}</span><strong>{t('show.summary.step', { count: steps.length })}</strong></div>
                    <div><span>{t('show.summary.duration')}</span><strong>{deployment.duration_ms !== null ? formatDuration(deployment.duration_ms) : '—'}</strong></div>
                    <div><span>{t('show.summary.source')}</span><strong>{deployment.trigger_source === 'manual' ? t('show.summary.manual') : t('show.summary.webhook')}</strong></div>
                </div>
            </section>

            <section className="deployment-pipeline" aria-labelledby="pipeline-title">
                <div className="deployment-section-heading">
                    <div><span className="deployment-eyebrow">{t('show.pipeline.eyebrow')}</span><h3 id="pipeline-title">{t('show.pipeline.title')}</h3></div>
                    <Text type="secondary">{t('show.pipeline.completed', { done: steps.filter((step) => step.status === 'succes').length, total: steps.length })}</Text>
                </div>
                <div className="app-modal-panel deployment-steps-panel">
                {steps.map((step, index) => (
                    <div key={step.id} className="deployment-step">
                        <div className={`deployment-step-row ${step.status === 'running' ? 'deployment-step-row--running' : ''}`}>
                            <StepStatusIcon status={step.status} />
                            <span className="step-ordinal">{index + 1}</span>
                            <span className={`step-row__type step-row__type--${step.type}`} title={step.type === 'command' ? t('show.pipeline.commandType') : t('show.pipeline.emailType')}>
                                {stepTypeIcon(step.type, 12)}
                            </span>
                            <Text strong className="deployment-step__label">
                                {step.label_snapshot}
                            </Text>
                            <span className="deployment-step__status">{getStatusLabel(t, step.status)}</span>
                            {step.duration_ms !== null && (
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    {formatDuration(step.duration_ms)}
                                </Text>
                            )}
                            {step.output && (
                                <Tooltip title={expandedSteps.has(step.id) ? t('show.pipeline.hideLogs') : t('show.pipeline.showLogs')}>
                                    <button
                                        type="button"
                                        className="step-row__output-toggle"
                                        onClick={() => toggleStepOutput(step.id)}
                                        aria-label={expandedSteps.has(step.id) ? t('show.pipeline.hideLogs') : t('show.pipeline.showLogs')}
                                    >
                                        <ChevronsUpDown size={13} />
                                    </button>
                                </Tooltip>
                            )}
                        </div>

                        {step.output && expandedSteps.has(step.id) && (
                            <div className={`deployment-step-output ${step.status === 'echec' ? 'deployment-step-output--error' : ''}`}>
                                {step.output}
                            </div>
                        )}

                        {step.status === 'running' && liveOutput[step.id] && (
                            <div
                                ref={(el) => {
                                    liveOutputEls.current[step.id] = el;
                                }}
                                className="deployment-step-output deployment-step-output--live"
                            >
                                {liveOutput[step.id]}
                            </div>
                        )}
                    </div>
                ))}
                </div>
            </section>
        </AuthenticatedLayout>
    );
}
