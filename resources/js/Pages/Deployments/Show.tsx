import StepStatusIcon from '@/Components/Deployments/StepStatusIcon';
import StatusTag from '@/Components/StatusTag';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { formatDuration, STATUS_LABELS } from '@/constants/deployments';
import { stepTypeIcon } from '@/constants/stepTypes';
import { useConfirm } from '@/theme/ConfirmContext';
import { PageProps } from '@/types';
import { Application, Deployment, DeploymentStep } from '@/types/models';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEcho } from '@laravel/echo-react';
import { Button, Space, Tooltip, Typography } from 'antd';
import { Boxes, ChevronLeft, ChevronsUpDown, History, Pencil, RotateCcw, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

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
            title: 'Annuler ce déploiement ?',
            content: "L'étape en cours sera arrêtée et les suivantes ne s'exécuteront pas.",
            okText: 'Annuler le déploiement',
            okType: 'danger',
            cancelText: 'Fermer',
            onOk: () => router.post(route('deployments.cancel', [workspace!.slug, application.slug, deployment.uuid])),
        });
    };

    const retry = () => {
        confirm.confirm({
            title: 'Relancer ce déploiement ?',
            content: `Un nouveau déploiement sera créé sur ${target.name} → ${environment.name} avec la même branche.`,
            okText: 'Relancer',
            cancelText: 'Annuler',
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
            title: 'Revenir à cette version ?',
            content: `Un nouveau déploiement sera créé sur ${target.name} → ${environment.name} avec la même branche/commit que ce déploiement réussi.`,
            okText: 'Revenir à cette version',
            cancelText: 'Annuler',
            onOk: () => {
                setRollingBack(true);
                router.post(route('deployments.rollback', [workspace!.slug, application.slug, deployment.uuid]), {}, {
                    onFinish: () => setRollingBack(false),
                });
            },
        });
    };

    return (
        <AuthenticatedLayout header="Déploiement">
            <Head title={`Déploiement #${deployment.id}`} />

            <Space size={8} wrap className="deployment-breadcrumbs" aria-label="Navigation du déploiement">
                <Link href={route('deployments.index', [workspace!.slug, application.slug])} className="deployment-nav-link deployment-nav-link--back">
                    <ChevronLeft size={15} /> <span>Historique des déploiements</span>
                </Link>
                <Link href={route('applications.show', [workspace!.slug, application.slug])} className="deployment-nav-link">
                    <Boxes size={15} /> <span>Voir l&apos;application</span>
                </Link>
                <Link
                    href={`${route('applications.show', [workspace!.slug, application.slug])}?tab=targets&target=${target.uuid}`}
                    className="deployment-nav-link deployment-nav-link--config"
                >
                    <Pencil size={15} /> <span>Modifier le pipeline</span>
                </Link>
            </Space>

            <section className="deployment-hero" aria-labelledby="deployment-title">
                <div className="deployment-hero__heading">
                    <div>
                        <span className="deployment-eyebrow">DÉPLOIEMENT #{deployment.id}</span>
                        <Title id="deployment-title" level={2} className="deployment-hero__title">
                            {target.name} <span aria-hidden="true">→</span> {environment.name}
                        </Title>
                        <Text type="secondary" className="deployment-hero__meta">
                            branche <strong>{deployment.branch ?? target.name}</strong> ·{' '}
                            {deployment.trigger_source === 'manual' ? 'déclenché manuellement' : 'déclenché par webhook'}
                            {deployment.triggered_by ? ` par ${deployment.triggered_by.name}` : ''}
                        </Text>
                    </div>

                    <div className="deployment-hero__actions" aria-label="Actions du déploiement">
                    <div className="deployment-hero__status"><span className="deployment-action-label">État actuel</span><StatusTag status={deployment.status} variant="tag" /></div>
                    {isActive && (
                        <Tooltip title="Arrêter l'étape en cours et annuler les suivantes">
                            <Button className="deployment-action deployment-action--danger" danger size="middle" icon={<Square size={14} />} onClick={cancel} aria-label="Annuler le déploiement">
                                Annuler
                            </Button>
                        </Tooltip>
                    )}
                    {canRetry && (
                        <Tooltip title="Relancer un nouveau déploiement avec la même branche">
                            <Button
                                className="deployment-action deployment-action--secondary"
                                size="middle"
                                icon={<RotateCcw size={14} />}
                                loading={retrying}
                                onClick={retry}
                                aria-label="Relancer le déploiement"
                            >
                                Relancer
                            </Button>
                        </Tooltip>
                    )}
                    {canRollback && (
                        <Tooltip title="Redéployer cette version connue-bonne">
                            <Button
                                className="deployment-action deployment-action--primary"
                                size="middle"
                                icon={<History size={14} />}
                                loading={rollingBack}
                                onClick={rollback}
                                aria-label="Revenir à cette version"
                            >
                                Revenir à cette version
                            </Button>
                        </Tooltip>
                    )}
                </div>
                </div>
                <div className="deployment-summary" aria-label="Résumé du déploiement">
                    <div><span>Pipeline</span><strong>{steps.length} {steps.length > 1 ? 'étapes' : 'étape'}</strong></div>
                    <div><span>Durée</span><strong>{deployment.duration_ms !== null ? formatDuration(deployment.duration_ms) : '—'}</strong></div>
                    <div><span>Source</span><strong>{deployment.trigger_source === 'manual' ? 'Manuel' : 'Webhook'}</strong></div>
                </div>
            </section>

            <section className="deployment-pipeline" aria-labelledby="pipeline-title">
                <div className="deployment-section-heading">
                    <div><span className="deployment-eyebrow">EXÉCUTION</span><h3 id="pipeline-title">Étapes du pipeline</h3></div>
                    <Text type="secondary">{steps.filter((step) => step.status === 'succes').length}/{steps.length} terminées</Text>
                </div>
                <div className="app-modal-panel deployment-steps-panel">
                {steps.map((step, index) => (
                    <div key={step.id} className="deployment-step">
                        <div className={`deployment-step-row ${step.status === 'running' ? 'deployment-step-row--running' : ''}`}>
                            <StepStatusIcon status={step.status} />
                            <span className="step-ordinal">{index + 1}</span>
                            <span className={`step-row__type step-row__type--${step.type}`} title={step.type === 'command' ? 'Commande shell' : 'Email'}>
                                {stepTypeIcon(step.type, 12)}
                            </span>
                            <Text strong className="deployment-step__label">
                                {step.label_snapshot}
                            </Text>
                            <span className="deployment-step__status">{STATUS_LABELS[step.status] ?? step.status}</span>
                            {step.duration_ms !== null && (
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    {formatDuration(step.duration_ms)}
                                </Text>
                            )}
                            {step.output && (
                                <Tooltip title={expandedSteps.has(step.id) ? 'Masquer les logs' : 'Voir les logs'}>
                                    <button
                                        type="button"
                                        className="step-row__output-toggle"
                                        onClick={() => toggleStepOutput(step.id)}
                                        aria-label={expandedSteps.has(step.id) ? 'Masquer les logs' : 'Voir les logs'}
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
