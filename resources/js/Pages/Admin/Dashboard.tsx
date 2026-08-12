import KpiCollapse from '@/Components/KpiCollapse';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';
import { Card, Empty, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { AlertTriangle, Building2, CheckCircle2, History, ShieldAlert, XOctagon } from 'lucide-react';

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
    const planColumns: ColumnsType<PlanDistributionRow> = [
        { title: 'Plan', dataIndex: 'plan_name', key: 'plan_name' },
        { title: 'Workspaces', dataIndex: 'total', key: 'total', align: 'right' },
    ];

    const topColumns: ColumnsType<TopWorkspaceRow> = [
        {
            title: 'Workspace',
            key: 'name',
            render: (_value, workspace) => (
                <Link href={route('admin.workspaces.show', workspace.slug)} className="applications-table__action">
                    {workspace.name}
                </Link>
            ),
        },
        { title: 'Déploiements', dataIndex: 'deployments_count', key: 'deployments_count', align: 'right' },
    ];

    return (
        <AdminLayout breadcrumbs={[{ label: 'Administration' }]}>
            <Head title="Administration — Tableau de bord" />

            <div className="premium-list-hero">
                <div>
                    <div className="premium-list-eyebrow">Plateforme</div>
                    <Title level={2} style={{ margin: 0 }}>
                        Tableau de bord super-admin
                    </Title>
                    <Paragraph type="secondary" style={{ margin: '6px 0 0' }}>
                        Vue d'ensemble de tous les workspaces, abonnements et déploiements de la plateforme.
                    </Paragraph>
                </div>
            </div>

            <KpiCollapse
                title="Indicateurs plateforme"
                subtitle="Chiffres agrégés sur l'ensemble des workspaces"
                items={[
                    { key: 'total_workspaces', title: 'Workspaces', value: kpis.total_workspaces, icon: <Building2 size={14} /> },
                    { key: 'active_workspaces', title: 'Actifs / avec abonnement', value: kpis.active_workspaces, icon: <CheckCircle2 size={14} /> },
                    { key: 'deployments_24h', title: 'Déploiements (24h)', value: kpis.deployments_24h, icon: <History size={14} /> },
                    { key: 'failed_deployments_24h', title: 'Échecs (24h)', value: kpis.failed_deployments_24h, icon: <XOctagon size={14} /> },
                    { key: 'failed_jobs', title: 'Jobs en échec', value: kpis.failed_jobs, icon: <ShieldAlert size={14} /> },
                ]}
            />

            <div className="admin-dashboard-grid">
                <Card
                    title="Répartition par plan"
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
                        <Empty description="Aucune donnée d'abonnement" style={{ padding: 24 }} />
                    )}
                </Card>

                <Card title="Top 5 workspaces (déploiements)" className="premium-table-card" styles={{ body: { padding: 0 } }}>
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
                        <Empty description="Aucun déploiement enregistré" style={{ padding: 24 }} />
                    )}
                </Card>
            </div>

            {kpis.failed_jobs > 0 && (
                <Card className="premium-table-card" style={{ marginTop: 16 }}>
                    <span className="premium-table__status premium-table__status--danger">
                        <AlertTriangle size={16} />
                        {kpis.failed_jobs} job(s) en échec dans la file d'attente — vérifiez Horizon.
                    </span>
                </Card>
            )}
        </AdminLayout>
    );
}
