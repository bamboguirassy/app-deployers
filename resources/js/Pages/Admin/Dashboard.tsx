import KpiCollapse from '@/Components/KpiCollapse';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';
import { Card, Empty, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { AlertTriangle, Building2, CheckCircle2, History, ShieldAlert, XOctagon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const { Title, Paragraph } = Typography;

interface DashboardKpis {
    total_workspaces: number;
    active_workspaces: number;
    deployments_24h: number;
    failed_deployments_24h: number;
    failed_jobs: number;
}

interface PlanDistributionRow {
    plan_name: string;
    total: number;
}

interface TopWorkspaceRow {
    id: number;
    name: string;
    slug: string;
    deployments_count: number;
}

export default function Dashboard({
    kpis,
    planDistribution,
    topWorkspaces,
}: {
    kpis: DashboardKpis;
    planDistribution: PlanDistributionRow[];
    topWorkspaces: TopWorkspaceRow[];
}) {
    const { t } = useTranslation('admin');

    const planColumns: ColumnsType<PlanDistributionRow> = [
        { title: t('dashboard.planDistribution.planColumn'), dataIndex: 'plan_name', key: 'plan_name' },
        { title: t('dashboard.planDistribution.workspacesColumn'), dataIndex: 'total', key: 'total', align: 'right' },
    ];

    const topColumns: ColumnsType<TopWorkspaceRow> = [
        {
            title: t('dashboard.topWorkspaces.workspaceColumn'),
            key: 'name',
            render: (_value, workspace) => (
                <Link href={route('admin.workspaces.show', workspace.slug)} className="applications-table__action">
                    {workspace.name}
                </Link>
            ),
        },
        { title: t('dashboard.topWorkspaces.deploymentsColumn'), dataIndex: 'deployments_count', key: 'deployments_count', align: 'right' },
    ];

    return (
        <AdminLayout breadcrumbs={[{ label: t('layout.breadcrumbFallback') }]}>
            <Head title={t('dashboard.title')} />

            <div className="premium-list-hero">
                <div>
                    <div className="premium-list-eyebrow">{t('dashboard.eyebrow')}</div>
                    <Title level={2} style={{ margin: 0 }}>
                        {t('dashboard.heading')}
                    </Title>
                    <Paragraph type="secondary" style={{ margin: '6px 0 0' }}>
                        {t('dashboard.subtitle')}
                    </Paragraph>
                </div>
            </div>

            <KpiCollapse
                title={t('dashboard.kpiTitle')}
                subtitle={t('dashboard.kpiSubtitle')}
                items={[
                    { key: 'total_workspaces', title: t('dashboard.kpis.totalWorkspaces'), value: kpis.total_workspaces, icon: <Building2 size={14} /> },
                    { key: 'active_workspaces', title: t('dashboard.kpis.activeWorkspaces'), value: kpis.active_workspaces, icon: <CheckCircle2 size={14} /> },
                    { key: 'deployments_24h', title: t('dashboard.kpis.deployments24h'), value: kpis.deployments_24h, icon: <History size={14} /> },
                    { key: 'failed_deployments_24h', title: t('dashboard.kpis.failedDeployments24h'), value: kpis.failed_deployments_24h, icon: <XOctagon size={14} /> },
                    { key: 'failed_jobs', title: t('dashboard.kpis.failedJobs'), value: kpis.failed_jobs, icon: <ShieldAlert size={14} /> },
                ]}
            />

            <div className="admin-dashboard-grid">
                <Card
                    title={t('dashboard.planDistribution.cardTitle')}
                    className="premium-table-card"
                    styles={{ body: { padding: 0 } }}
                >
                    {planDistribution.length > 0 ? (
                        <Table
                            rowKey="plan_name"
                            dataSource={planDistribution}
                            columns={planColumns}
                            pagination={false}
                            className="premium-table"
                            scroll={{ x: 'max-content' }}
                        />
                    ) : (
                        <Empty description={t('dashboard.planDistribution.empty')} style={{ padding: 24 }} />
                    )}
                </Card>

                <Card title={t('dashboard.topWorkspaces.cardTitle')} className="premium-table-card" styles={{ body: { padding: 0 } }}>
                    {topWorkspaces.length > 0 ? (
                        <Table
                            rowKey="id"
                            dataSource={topWorkspaces}
                            columns={topColumns}
                            pagination={false}
                            className="premium-table"
                            scroll={{ x: 'max-content' }}
                        />
                    ) : (
                        <Empty description={t('dashboard.topWorkspaces.empty')} style={{ padding: 24 }} />
                    )}
                </Card>
            </div>

            {kpis.failed_jobs > 0 && (
                <Card className="premium-table-card" style={{ marginTop: 16 }}>
                    <span className="premium-table__status premium-table__status--danger">
                        <AlertTriangle size={16} />
                        {t('dashboard.failedJobsWarning', { count: kpis.failed_jobs })}
                    </span>
                </Card>
            )}
        </AdminLayout>
    );
}
