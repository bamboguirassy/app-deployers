import StepStatusIcon from '@/Components/Deployments/StepStatusIcon';
import StatusTag from '@/Components/StatusTag';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { formatDuration, getStatusLabel } from '@/constants/deployments';
import { useConfirm } from '@/theme/ConfirmContext';
import { PageProps } from '@/types';
import { Application, Deployment, DeploymentStep } from '@/types/models';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEcho } from '@laravel/echo-react';
import { Avatar, Button, Tooltip } from 'antd';
import { Boxes, ExternalLink, GitBranch, History, Pencil, RotateCcw, Square, User, Webhook } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

function formatDateShort(iso: string | null): string {
    if (!iso) return '—';
    return new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso));
}

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
        Object.keys(liveOutput).forEach((id) => {
            const el = liveOutputEls.current[Number(id)];
            if (el) el.scrollTop = el.scrollHeight;
        });
    }, [liveOutput]);

    const toggleStep = (id: number) =>
        setExpandedSteps((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });

    useEcho(`application.${application.id}`, '.deploiement.statut',
        (p: { deployment_id: number; statut: Deployment['status']; duration_ms: number | null }) => {
            if (p.deployment_id !== deployment.id) return;
            setDeployment((prev) => ({ ...prev, status: p.statut, duration_ms: p.duration_ms }));
        }, [deployment.uuid]);

    useEcho(`application.${application.id}`, '.deploiement.etape',
        (p: { deployment_id: number; step_id: number; statut: DeploymentStep['status']; exit_code: number | null; duration_ms: number | null; error_excerpt: string | null }) => {
            if (p.deployment_id !== deployment.id) return;
            const accumulated = liveOutputRef.current[p.step_id];
            setSteps((prev) => prev.map((s) =>
                s.id === p.step_id
                    ? { ...s, status: p.statut, exit_code: p.exit_code, duration_ms: p.duration_ms, output: p.error_excerpt ?? accumulated ?? s.output }
                    : s,
            ));
            if (p.error_excerpt || accumulated) setExpandedSteps((prev) => new Set(prev).add(p.step_id));
            setLiveOutput((prev) => { if (!(p.step_id in prev)) return prev; const n = { ...prev }; delete n[p.step_id]; return n; });
        }, [deployment.uuid]);

    useEcho(`application.${application.id}`, '.deploiement.sortie',
        (p: { deployment_id: number; step_id: number; chunk: string }) => {
            if (p.deployment_id !== deployment.id) return;
            setLiveOutput((prev) => ({ ...prev, [p.step_id]: (prev[p.step_id] ?? '') + p.chunk }));
        }, [deployment.uuid]);

    const target = deployment.target_environment.target;
    const environment = deployment.target_environment.environment;
    const isActive = deployment.status === 'pending' || deployment.status === 'running';
    const canRetry = deployment.status === 'echec' || deployment.status === 'annule';
    const canRollback = deployment.status === 'succes';

    const cancel = () => confirm.confirm({
        title: t('show.cancel.confirmTitle'), content: t('show.cancel.confirmContent'),
        okText: t('show.cancel.okText'), okType: 'danger', cancelText: t('show.cancel.cancelText'),
        onOk: () => router.post(route('deployments.cancel', [workspace!.slug, application.slug, deployment.uuid])),
    });

    const retry = () => confirm.confirm({
        title: t('show.retry.confirmTitle'),
        content: t('show.retry.confirmContent', { target: target.name, environment: environment.name }),
        okText: t('show.retry.okText'), cancelText: t('show.retry.cancelText'),
        onOk: () => { setRetrying(true); router.post(route('deployments.retry', [workspace!.slug, application.slug, deployment.uuid]), {}, { onFinish: () => setRetrying(false) }); },
    });

    const rollback = () => confirm.confirm({
        title: t('show.rollback.confirmTitle'),
        content: t('show.rollback.confirmContent', { target: target.name, environment: environment.name }),
        okText: t('show.rollback.okText'), cancelText: t('show.rollback.cancelText'),
        onOk: () => { setRollingBack(true); router.post(route('deployments.rollback', [workspace!.slug, application.slug, deployment.uuid]), {}, { onFinish: () => setRollingBack(false) }); },
    });

    return (
        <AuthenticatedLayout header={t('show.header')}>
            <Head title={t('show.pageTitle', { id: deployment.id })} />

            <div className="dp-page">

                {/* ── Nav bar ── */}
                <div className="dp-topbar" aria-label={t('show.nav.label')}>
                    <Link href={`${route('applications.show', [workspace!.slug, application.slug])}?tab=deployments`} className="dp-topbar__back">
                        <History size={14} /><span>{t('show.nav.history')}</span>
                    </Link>
                    <Link href={route('applications.show', [workspace!.slug, application.slug])} className="dp-topbar__app">
                        <Avatar size={20} src={application.logo_url ?? undefined} icon={!application.logo_url && <Boxes size={10} />} shape="square" />
                        <span>{application.name}</span>
                    </Link>
                    <Link
                        href={`${route('applications.show', [workspace!.slug, application.slug])}?tab=targets&target=${target.uuid}`}
                        className="dp-topbar__edit"
                    >
                        <Pencil size={13} /><span>{t('show.nav.editPipeline')}</span>
                    </Link>
                </div>

                {/* ── Status zone ── */}
                <div className={`dp-status-zone dp-status-zone--${deployment.status}`}>
                    <div className="dp-sz__eyebrow">{t('show.eyebrow', { id: deployment.id })}</div>
                    <h1 className="dp-sz__title">
                        {target.name}
                        <span className="dp-sz__arrow">→</span>
                        <span className="dp-sz__env">{environment.name}</span>
                    </h1>
                    <div className="dp-sz__meta">
                        <StatusTag status={deployment.status} variant="tag" />
                        {deployment.branch && (
                            <span className="dp-sz__meta-item">
                                <GitBranch size={12} />{deployment.branch}
                            </span>
                        )}
                        <span className="dp-sz__meta-item">
                            {deployment.trigger_source === 'manual' ? <User size={12} /> : <Webhook size={12} />}
                            {deployment.triggered_by ? deployment.triggered_by.name : (deployment.trigger_source === 'manual' ? t('show.triggeredManually') : t('show.triggeredByWebhook'))}
                        </span>
                        {deployment.started_at && (
                            <span className="dp-sz__meta-item dp-sz__meta-item--date">
                                {formatDateShort(deployment.started_at)}
                            </span>
                        )}
                        {deployment.duration_ms !== null && (
                            <span className="dp-sz__meta-item dp-sz__meta-item--duration">
                                {formatDuration(deployment.duration_ms)}
                            </span>
                        )}
                    </div>
                </div>

                {/* ── Body: pipeline | divider | detail ── */}
                <div className="dp-body">

                    {/* Pipeline */}
                    <section className="dp-pipeline-zone" aria-labelledby="pipeline-title">
                        <div className="dp-pz__header">
                            <h2 id="pipeline-title">{t('show.pipeline.title')}</h2>
                            <span className="dp-pz__count">
                                {steps.filter((s) => s.status === 'succes').length}/{steps.length}
                            </span>
                        </div>

                        <ol className="dp-steps" aria-label={t('show.pipeline.title')}>
                            {steps.map((step) => {
                                const isRunning = step.status === 'running';
                                const hasLive = isRunning && !!liveOutput[step.id];
                                const hasOutput = !!step.output;
                                const isExpanded = expandedSteps.has(step.id);
                                const showOutput = hasOutput && isExpanded;
                                const showLive = hasLive;
                                const isFailed = step.status === 'echec';

                                return (
                                    <li
                                        key={step.id}
                                        className={[
                                            'dp-step',
                                            `dp-step--${step.status}`,
                                            isRunning ? 'dp-step--running' : '',
                                        ].filter(Boolean).join(' ')}
                                    >
                                        <div className="dp-step__row">
                                            <div className="dp-step__icon">
                                                <StepStatusIcon status={step.status} />
                                            </div>
                                            <div className="dp-step__content">
                                                <span className="dp-step__label">{step.label_snapshot}</span>
                                                {(hasOutput || hasLive) && (
                                                    <Tooltip title={isExpanded ? t('show.pipeline.hideLogs') : t('show.pipeline.showLogs')}>
                                                        <button
                                                            type="button"
                                                            className="dp-step__toggle"
                                                            onClick={() => toggleStep(step.id)}
                                                            aria-expanded={isExpanded}
                                                            aria-label={isExpanded ? t('show.pipeline.hideLogs') : t('show.pipeline.showLogs')}
                                                        >
                                                            {isExpanded ? 'Masquer' : isFailed ? 'Voir l\'erreur' : 'Voir les logs'}
                                                        </button>
                                                    </Tooltip>
                                                )}
                                            </div>
                                            {step.duration_ms !== null && (
                                                <span className="dp-step__duration">{formatDuration(step.duration_ms)}</span>
                                            )}
                                        </div>

                                        {showOutput && (
                                            <div className={`dp-step__output ${isFailed ? 'dp-step__output--error' : ''}`}>
                                                {step.output}
                                            </div>
                                        )}
                                        {showLive && (
                                            <div
                                                ref={(el) => { liveOutputEls.current[step.id] = el; }}
                                                className="dp-step__output dp-step__output--live"
                                            >
                                                {liveOutput[step.id]}
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ol>
                    </section>

                    {/* Divider */}
                    <div className="dp-body__divider" aria-hidden="true" />

                    {/* Detail */}
                    <aside className="dp-detail-zone">
                        <dl className="dp-facts">
                            {deployment.branch && (
                                <div className="dp-facts__row">
                                    <dt>Branche</dt>
                                    <dd><GitBranch size={12} />{deployment.branch}</dd>
                                </div>
                            )}
                            {deployment.triggered_by && (
                                <div className="dp-facts__row">
                                    <dt>Déclenché par</dt>
                                    <dd><User size={12} />{deployment.triggered_by.name}</dd>
                                </div>
                            )}
                            {deployment.started_at && (
                                <div className="dp-facts__row">
                                    <dt>Démarré</dt>
                                    <dd>{formatDateShort(deployment.started_at)}</dd>
                                </div>
                            )}
                            {deployment.finished_at && (
                                <div className="dp-facts__row">
                                    <dt>Terminé</dt>
                                    <dd>{formatDateShort(deployment.finished_at)}</dd>
                                </div>
                            )}
                            {deployment.duration_ms !== null && (
                                <div className="dp-facts__row">
                                    <dt>Durée</dt>
                                    <dd className="dp-facts__duration">{formatDuration(deployment.duration_ms)}</dd>
                                </div>
                            )}
                        </dl>

                        <div className="dp-detail-zone__actions" aria-label={t('show.actionsLabel')}>
                            {deployment.status === 'succes' && deployment.target_environment.url && (
                                <Button
                                    icon={<ExternalLink size={13} />}
                                    onClick={() => window.open(deployment.target_environment.url!, '_blank', 'noopener,noreferrer')}
                                >
                                    {t('show.openEnvironmentUrl')}
                                </Button>
                            )}
                            {isActive && (
                                <Button danger icon={<Square size={13} />} onClick={cancel} aria-label={t('show.cancel.ariaLabel')}>
                                    {t('show.cancel.button')}
                                </Button>
                            )}
                            {canRetry && (
                                <Button type="primary" icon={<RotateCcw size={13} />} loading={retrying} onClick={retry} aria-label={t('show.retry.ariaLabel')}>
                                    {t('show.retry.button')}
                                </Button>
                            )}
                            {canRollback && (
                                <Button type="primary" icon={<History size={13} />} loading={rollingBack} onClick={rollback} aria-label={t('show.rollback.ariaLabel')}>
                                    {t('show.rollback.button')}
                                </Button>
                            )}
                        </div>
                    </aside>
                </div>

            </div>{/* /dp-page */}
        </AuthenticatedLayout>
    );
}
