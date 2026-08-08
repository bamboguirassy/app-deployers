import { SourceIcon } from '@/Components/Deployments/DeploymentIcons';
import StatusTag from '@/Components/StatusTag';
import TrendHint, { Trend } from '@/Components/TrendHint';
import { SOURCE_LABELS } from '@/constants/deployments';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { timeAgo } from '@/lib/time';
import { PageProps } from '@/types';
import { Deployment } from '@/types/models';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Avatar, Card, Col, Empty, Row, Statistic, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ArrowRight, Boxes, CheckCircle2, ChevronRight, Clock, GitBranch, Layers, Zap } from 'lucide-react';

const { Title, Paragraph } = Typography;

interface DashboardStats {
    applications: number;
    targets: number;
    environments: number;
    deployments_30d: number;
    success_rate_30d: number | null;
    running: number;
}

interface DashboardTrends {
    applications: Trend | null;
    targets: Trend | null;
    environments: Trend | null;
    deployments_30d: Trend | null;
    running: Trend | null;
    success_rate_30d: Trend | null;
}

interface StatusBreakdown {
    pending: number;
    running: number;
    succes: number;
    echec: number;
    annule: number;
}

interface ApplicationOverview {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    logo_url: string | null;
    targets_count: number;
    environments_count: number;
    last_deployment_status: string | null;
    last_deployment_at: string | null;
}

const BREAKDOWN_SEGMENTS: { key: keyof StatusBreakdown; label: string; color: string }[] = [
    { key: 'succes', label: 'Succès', color: 'var(--color-success)' },
    { key: 'echec', label: 'Échec', color: 'var(--color-danger)' },
    { key: 'running', label: 'En cours', color: 'var(--color-info)' },
    { key: 'pending', label: 'En attente', color: 'var(--color-text-muted)' },
    { key: 'annule', label: 'Annulé', color: 'var(--color-warning)' },
];

export default function Dashboard({
    stats,
    trends,
    statusBreakdown,
    recentDeployments,
    applications,
}: {
    stats: DashboardStats;
    trends: DashboardTrends;
    statusBreakdown: StatusBreakdown;
    recentDeployments: Deployment[];
    applications: ApplicationOverview[];
}) {
    const { auth, workspace } = usePage<PageProps>().props;
    const user = auth.user;

    const totalBreakdown =
        statusBreakdown.pending + statusBreakdown.running + statusBreakdown.succes + statusBreakdown.echec + statusBreakdown.annule;

    const applicationColumns: ColumnsType<ApplicationOverview> = [
        {
            title: 'Application',
            key: 'name',
            render: (_value, application) => (
                <span className="applications-table__name">
                    <Avatar
                        size={32}
                        src={application.logo_url ?? undefined}
                        icon={!application.logo_url && <Boxes size={14} />}
                        shape="square"
                    />
                    <span className="applications-table__name-text">
                        <strong>{application.name}</strong>
                        <small>{application.description || 'Aucune description'}</small>
                    </span>
                </span>
            ),
        },
        {
            title: 'Targets',
            dataIndex: 'targets_count',
            key: 'targets_count',
            align: 'center',
            render: (value) => <span className="mini-chip">{value}</span>,
        },
        {
            title: 'Environnements',
            dataIndex: 'environments_count',
            key: 'environments_count',
            align: 'center',
            render: (value) => <span className="mini-chip">{value}</span>,
        },
        {
            title: 'Dernier déploiement',
            key: 'last_deployment',
            render: (_value, application) =>
                application.last_deployment_status ? (
                    <span className="last-deployment-cell">
                        <StatusTag status={application.last_deployment_status} size={13} />
                        {application.last_deployment_at && <small>{timeAgo(application.last_deployment_at)}</small>}
                    </span>
                ) : (
                    <span className="section-hint">Aucun</span>
                ),
        },
        {
            title: '',
            key: 'action',
            align: 'right',
            render: (_value, application) => (
                <Link href={route('applications.show', [workspace!.slug, application.slug])} className="dashboard-row-chevron">
                    <ChevronRight size={16} />
                </Link>
            ),
        },
    ];

    const deploymentColumns: ColumnsType<Deployment> = [
        {
            title: 'Application',
            key: 'application',
            render: (_value, d) => (
                <span className="applications-table__name">
                    <Avatar
                        size={28}
                        src={d.target_environment.target.application?.logo_url ?? undefined}
                        icon={!d.target_environment.target.application?.logo_url && <Boxes size={12} />}
                        shape="square"
                    />
                    <span className="applications-table__name-text">
                        <strong>{d.target_environment.target.application?.name ?? '—'}</strong>
                    </span>
                </span>
            ),
        },
        {
            title: 'Cible',
            key: 'target',
            render: (_value, d) => (
                <span>
                    {d.target_environment.target.name} <ArrowRight size={12} style={{ verticalAlign: 'middle', opacity: 0.5 }} />{' '}
                    {d.target_environment.environment.name}
                </span>
            ),
        },
        {
            title: 'Source',
            dataIndex: 'trigger_source',
            key: 'trigger_source',
            render: (source) => (
                <span className="source-chip">
                    <SourceIcon source={source} />
                    {SOURCE_LABELS[source] ?? source}
                </span>
            ),
        },
        {
            title: 'Statut',
            dataIndex: 'status',
            key: 'status',
            render: (status) => <StatusTag status={status} />,
        },
        {
            title: 'Quand',
            key: 'created_at',
            align: 'right',
            render: (_value, d) => <span className="section-hint">{timeAgo(d.created_at)}</span>,
        },
        {
            title: '',
            key: 'action',
            align: 'right',
            render: (_value, d) => (
                <span className="dashboard-row-chevron">
                    <ChevronRight size={16} />
                </span>
            ),
        },
    ];

    return (
        <AuthenticatedLayout header="Dashboard">
            <Head title="Dashboard" />

            <Title level={4} style={{ marginBottom: 4 }}>
                Bienvenue, {user.name} 👋
            </Title>
            <Paragraph type="secondary" style={{ marginBottom: 24 }}>
                Voici un aperçu de vos applications et de leur activité de déploiement.
            </Paragraph>

            <Row gutter={[16, 16]}>
                <Col xs={12} sm={8} lg={4}>
                    <Card className="stat-tile">
                        <Statistic title="Applications" value={stats.applications} prefix={<Boxes size={16} />} />
                        <TrendHint trend={trends.applications} />
                    </Card>
                </Col>
                <Col xs={12} sm={8} lg={4}>
                    <Card className="stat-tile">
                        <Statistic title="Targets" value={stats.targets} prefix={<GitBranch size={16} />} />
                        <TrendHint trend={trends.targets} />
                    </Card>
                </Col>
                <Col xs={12} sm={8} lg={4}>
                    <Card className="stat-tile">
                        <Statistic title="Environnements" value={stats.environments} prefix={<Layers size={16} />} />
                        <TrendHint trend={trends.environments} />
                    </Card>
                </Col>
                <Col xs={12} sm={8} lg={4}>
                    <Card className="stat-tile">
                        <Statistic title="Déploiements (30j)" value={stats.deployments_30d} prefix={<Zap size={16} />} />
                        <TrendHint trend={trends.deployments_30d} />
                    </Card>
                </Col>
                <Col xs={12} sm={8} lg={4}>
                    <Card className="stat-tile">
                        <Statistic title="En cours" value={stats.running} prefix={<Clock size={16} />} />
                        <TrendHint trend={trends.running} />
                    </Card>
                </Col>
                <Col xs={12} sm={8} lg={4}>
                    <Card className="stat-tile">
                        <Statistic
                            title="Taux de succès (30j)"
                            value={stats.success_rate_30d ?? '—'}
                            suffix={stats.success_rate_30d !== null ? '%' : ''}
                            prefix={<CheckCircle2 size={16} />}
                        />
                        <TrendHint trend={trends.success_rate_30d} />
                    </Card>
                </Col>
            </Row>

            {totalBreakdown > 0 && (
                <Card style={{ marginTop: 16 }} title="Répartition des déploiements (30 derniers jours)">
                    <div className="breakdown-bar">
                        {BREAKDOWN_SEGMENTS.filter((seg) => statusBreakdown[seg.key] > 0).map((seg) => {
                            const count = statusBreakdown[seg.key];
                            const pct = (count / totalBreakdown) * 100;
                            return (
                                <div
                                    key={seg.key}
                                    className="breakdown-bar__segment"
                                    style={{ width: `${pct}%`, backgroundColor: seg.color }}
                                    title={`${seg.label} : ${count}`}
                                >
                                    {pct >= 8 && (
                                        <span>
                                            {count} ({pct.toFixed(1)}%)
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <div className="breakdown-legend">
                        {BREAKDOWN_SEGMENTS.map((seg) => (
                            <div className="breakdown-legend__item" key={seg.key}>
                                <span className="breakdown-legend__label">
                                    <span className="breakdown-legend__dot" style={{ backgroundColor: seg.color }} />
                                    {seg.label}
                                </span>
                                <strong>{statusBreakdown[seg.key]}</strong>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col xs={24} xl={12}>
                    <Card
                        className="premium-table-card"
                        title="Applications"
                        extra={
                            <Link href={route('applications.index', workspace!.slug)} className="premium-table__action">
                                Voir tout <ArrowRight size={14} />
                            </Link>
                        }
                    >
                        {applications.length === 0 ? (
                            <Empty description="Aucune application pour le moment" />
                        ) : (
                            <Table
                                rowKey="id"
                                dataSource={applications}
                                columns={applicationColumns}
                                pagination={false}
                                className="premium-table"
                                size="small"
                                onRow={(record) => ({
                                    onClick: () => router.visit(route('applications.show', [workspace!.slug, record.slug])),
                                    onKeyDown: (e) => e.key === 'Enter' && router.visit(route('applications.show', [workspace!.slug, record.slug])),
                                    tabIndex: 0,
                                    style: { cursor: 'pointer' },
                                })}
                            />
                        )}
                    </Card>
                </Col>

                <Col xs={24} xl={12}>
                    <Card
                        className="premium-table-card"
                        title="Déploiements récents"
                        extra={
                            <Link href={route('deployments.all', workspace!.slug)} className="premium-table__action">
                                Voir tout <ArrowRight size={14} />
                            </Link>
                        }
                    >
                        {recentDeployments.length === 0 ? (
                            <Empty description="Aucun déploiement pour le moment" />
                        ) : (
                            <Table
                                rowKey="id"
                                dataSource={recentDeployments}
                                columns={deploymentColumns}
                                pagination={false}
                                className="premium-table"
                                size="small"
                                onRow={(record) => {
                                    const href = route('deployments.show', [
                                        workspace!.slug,
                                        record.target_environment.target.application!.slug,
                                        record.id,
                                    ]);

                                    return {
                                        onClick: () => router.visit(href),
                                        onKeyDown: (e) => e.key === 'Enter' && router.visit(href),
                                        tabIndex: 0,
                                        style: { cursor: 'pointer' },
                                    };
                                }}
                            />
                        )}
                    </Card>
                </Col>
            </Row>

            {applications.length === 0 && (
                <Card style={{ marginTop: 16 }}>
                    <Paragraph type="secondary" style={{ margin: 0 }}>
                        Aucune application pour le moment.{' '}
                        <Link href={route('applications.create', workspace!.slug)}>Créez votre première application</Link> pour commencer à configurer des
                        targets, des environnements et des pipelines de déploiement.
                    </Paragraph>
                </Card>
            )}
        </AuthenticatedLayout>
    );
}
