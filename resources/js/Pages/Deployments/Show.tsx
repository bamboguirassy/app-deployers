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
import { Avatar, Button, Progress, Tooltip, Typography } from 'antd';
import { Boxes, ChevronLeft, ChevronsUpDown, ExternalLink, GitBranch, History, Layers, Pencil, RotateCcw, Square, User, Webhook, Zap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

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
        Object.keys(liveOutput).forEach((stepId) => {
            const el = liveOutputEls.current[Number(stepId)];
            if (el) el.scrollTop = el.scrollHeight;
        });
    }, [liveOutput]);

    const toggleStepOutput = (stepId: number) => {
        setExpandedSteps((prev) => {
            const next = new Set(prev);
            if (next.has(stepId)) next.delete(stepId);
            else next.add(stepId);
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

    const completedSteps = steps.filter((s) => s.status === 'succes').length;
    const failedSteps = steps.filter((s) => s.status === 'echec').length;
    const progressPercent = steps.length > 0 ? Math.round((completedSteps / steps.length) * 100) : 0;
    const progressStatus = failedSteps > 0 ? 'exception' : isActive ? 'active' : deployment.status === 'succes' ? 'success' : 'normal';

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

            {/* Top navigation bar */}
            <div className="dp-topbar" aria-label={t('show.nav.label')}>
                <Link
                    href={route('deployments.index', [workspace!.slug, application.slug])}
                    className="dp-topbar__back"
                >
                    <ChevronLeft size={15} />
                    <span>{t('show.nav.history')}</span>
                </Link>

                <Link
                    href={route('applications.show', [workspace!.slug, application.slug])}
                    className="dp-topbar__app"
                >
                    <Avatar
                        size={22}
                        src={application.logo_url ?? undefined}
                        icon={!application.logo_url && <Boxes size={11} />}
                        shape="square"
                    />
                    <span>{application.name}</span>
                </Link>

                <Link
                    href={`${route('applications.show', [workspace!.slug, application.slug])}?tab=targets&target=${target.uuid}`}
                    className="dp-topbar__edit"
                >
                    <Pencil size={13} />
                    <span>{t('show.nav.editPipeline')}</span>
                </Link>
            </div>

            {/* Hero card */}
            <div className="dp-hero">
                <div className="dp-hero__header">
                    <div className="dp-hero__id">
                        {t('show.eyebrow', { id: deployment.id })}
                    </div>
                    <StatusTag status={deployment.status} variant="tag" />
                </div>

                <div className="dp-hero__title">
                    <span className="dp-hero__target">{target.name}</span>
                    <span className="dp-hero__arrow" aria-hidden="true">→</span>
                    <span className="dp-hero__env">{environment.name}</span>
                </div>

                <div className="dp-hero__meta">
                    <span className="dp-hero__chip">
                        <GitBranch size={12} />
                        {deployment.branch ?? target.name}
                    </span>
                    <span className="dp-hero__chip">
                        <Layers size={12} />
                        {target.name}
                    </span>
                    <span className="dp-hero__chip">
                        {deployment.trigger_source === 'manual' ? <User size={12} /> : <Webhook size={12} />}
                        {deployment.trigger_source === 'manual' ? t('show.triggeredManually') : t('show.triggeredByWebhook')}
                        {deployment.triggered_by ? ` · ${deployment.triggered_by.name}` : ''}
                    </span>
                    {deployment.duration_ms !== null && (
                        <span className="dp-hero__chip dp-hero__chip--duration">
                            <Zap size={12} />
                            {formatDuration(deployment.duration_ms)}
                        </span>
                    )}
                </div>

                <div className="dp-hero__progress">
                    <Progress
                        percent={progressPercent}
                        status={progressStatus}
                        size="small"
                        showInfo={false}
                        strokeColor={
                            progressStatus === 'exception'
                                ? 'var(--color-danger)'
                                : progressStatus === 'success'
                                  ? 'var(--color-success)'
                                  : 'var(--color-primary)'
                        }
                    />
                    <span className="dp-hero__progress-label">
                        {t('show.pipeline.completed', { done: completedSteps, total: steps.length })}
                    </span>
                </div>

                <div className="dp-hero__actions">
                    {deployment.status === 'succes' && deployment.target_environment.url && (
                        <Button
                            size="small"
                            icon={<ExternalLink size={13} />}
                            onClick={() => window.open(deployment.target_environment.url!, '_blank', 'noopener,noreferrer')}
                        >
                            {t('show.openEnvironmentUrl')}
                        </Button>
                    )}
                    {isActive && (
                        <Tooltip title={t('show.cancel.tooltip')}>
                            <Button
                                danger
                                size="small"
                                icon={<Square size={13} />}
                                onClick={cancel}
                                aria-label={t('show.cancel.ariaLabel')}
                            >
                                {t('show.cancel.button')}
                            </Button>
                        </Tooltip>
                    )}
                    {canRetry && (
                        <Tooltip title={t('show.retry.tooltip')}>
                            <Button
                                size="small"
                                icon={<RotateCcw size={13} />}
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
                                size="small"
                                type="primary"
                                icon={<History size={13} />}
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

            {/* Pipeline timeline */}
            <section className="dp-pipeline" aria-labelledby="pipeline-title">
                <div className="dp-pipeline__header">
                    <h3 id="pipeline-title">{t('show.pipeline.title')}</h3>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {t('show.pipeline.completed', { done: completedSteps, total: steps.length })}
                    </Text>
                </div>

                <div className="dp-timeline">
                    {steps.map((step, index) => {
                        const isRunning = step.status === 'running';
                        const hasLive = isRunning && !!liveOutput[step.id];
                        const hasOutput = !!step.output;
                        const isExpanded = expandedSteps.has(step.id);
                        const canExpand = hasOutput || hasLive;

                        return (
                            <div
                                key={step.id}
                                className={[
                                    'dp-step',
                                    `dp-step--${step.status}`,
                                    isRunning ? 'dp-step--running' : '',
                                ].filter(Boolean).join(' ')}
                            >
                                {/* Connector line */}
                                {index < steps.length - 1 && <div className="dp-step__connector" aria-hidden="true" />}

                                <div className="dp-step__row">
                                    <div className="dp-step__icon-col">
                                        <StepStatusIcon status={step.status} />
                                    </div>

                                    <div className="dp-step__body">
                                        <div className="dp-step__main">
                                            <span className="dp-step__ordinal">{index + 1}</span>
                                            <span
                                                className={`dp-step__type dp-step__type--${step.type}`}
                                                title={step.type === 'command' ? t('show.pipeline.commandType') : t('show.pipeline.emailType')}
                                            >
                                                {stepTypeIcon(step.type, 12)}
                                            </span>
                                            <span className="dp-step__label">{step.label_snapshot}</span>
                                            <span className="dp-step__status-text">{getStatusLabel(t, step.status)}</span>
                                            {step.duration_ms !== null && (
                                                <span className="dp-step__duration">{formatDuration(step.duration_ms)}</span>
                                            )}
                                            {canExpand && (
                                                <Tooltip title={isExpanded ? t('show.pipeline.hideLogs') : t('show.pipeline.showLogs')}>
                                                    <button
                                                        type="button"
                                                        className="dp-step__toggle"
                                                        onClick={() => toggleStepOutput(step.id)}
                                                        aria-label={isExpanded ? t('show.pipeline.hideLogs') : t('show.pipeline.showLogs')}
                                                        aria-expanded={isExpanded}
                                                    >
                                                        <ChevronsUpDown size={13} />
                                                    </button>
                                                </Tooltip>
                                            )}
                                        </div>

                                        {hasOutput && isExpanded && (
                                            <div className={`dp-step__output ${step.status === 'echec' ? 'dp-step__output--error' : ''}`}>
                                                {step.output}
                                            </div>
                                        )}

                                        {hasLive && (
                                            <div
                                                ref={(el) => { liveOutputEls.current[step.id] = el; }}
                                                className="dp-step__output dp-step__output--live"
                                            >
                                                {liveOutput[step.id]}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>
        </AuthenticatedLayout>
    );
}
