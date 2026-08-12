import AdminLayout from '@/Layouts/AdminLayout';
import { useConfirm } from '@/theme/ConfirmContext';
import { timeAgo } from '@/lib/time';
import {
    AdminApplicationStats,
    AdminFailedDeployment,
    AdminWorkspace,
    AdminWorkspaceMember,
    Plan,
    SubscriptionHistoryEntry,
} from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Avatar, Button, Card, Descriptions, Empty, Select, Table, Tabs, Tag, Timeline, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Building2, ShieldAlert, ShieldCheck, Users } from 'lucide-react';

const { Title, Paragraph, Text } = Typography;

const STATUS_OPTIONS = [
    { value: 'active', label: 'active' },
    { value: 'past_due', label: 'past_due' },
    { value: 'canceled', label: 'canceled' },
];

const ROLE_LABELS: Record<string, string> = {
    owner: 'Owner',
    manager: 'Manager',
    deployer: 'Deployer',
    viewer: 'Viewer',
};

const SOURCE_LABELS: Record<string, string> = {
    admin: 'Super-admin',
    webhook: 'Paddle (webhook)',
    system: 'Système',
};

export default function Show({
    workspace,
    members,
    owners,
    applications,
    subscriptionHistory,
    plans,
}: {
    workspace: AdminWorkspace;
    members: AdminWorkspaceMember[];
    owners: AdminWorkspaceMember[];
    applications: AdminApplicationStats[];
    subscriptionHistory: SubscriptionHistoryEntry[];
    plans: Plan[];
}) {
    const confirm = useConfirm();
    const { data, setData, patch, processing } = useForm({
        plan_id: workspace.subscription?.plan_id ?? undefined,
        status: workspace.subscription?.status ?? undefined,
    });

    const toggleSuspend = () => {
        if (workspace.suspended_at) {
            confirm.confirm({
                title: `Réactiver le workspace "${workspace.name}" ?`,
                okText: 'Réactiver',
                cancelText: 'Annuler',
                onOk: () => router.post(route('admin.workspaces.reactivate', workspace.slug)),
            });
        } else {
            confirm.confirm({
                title: `Suspendre le workspace "${workspace.name}" ?`,
                content: "Les membres n'auront plus accès à ce workspace tant qu'il ne sera pas réactivé.",
                okType: 'danger',
                okText: 'Suspendre',
                cancelText: 'Annuler',
                onOk: () => router.post(route('admin.workspaces.suspend', workspace.slug)),
            });
        }
    };

    const submitSubscription = () => {
        patch(route('admin.workspaces.subscription.update', workspace.slug));
    };

    const isComped = workspace.subscription?.is_comped ?? false;

    const grantFreePro = () => {
        confirm.confirm({
            title: `Offrir le plan Pro gratuitement à "${workspace.name}" ?`,
            content: "Aucune facturation Paddle n'est déclenchée — l'accès Pro reste actif tant que vous ne le retirez pas.",
            okText: 'Offrir Pro',
            cancelText: 'Annuler',
            onOk: () => router.post(route('admin.workspaces.subscription.grant-free', workspace.slug)),
        });
    };

    const revokeFreePro = () => {
        confirm.confirm({
            title: `Retirer l'offre gratuite de "${workspace.name}" ?`,
            content: 'Le workspace retombera immédiatement sur le plan Free.',
            okType: 'danger',
            okText: 'Retirer',
            cancelText: 'Annuler',
            onOk: () => router.post(route('admin.workspaces.subscription.revoke-free', workspace.slug)),
        });
    };

    const renewalDate =
        workspace.subscription?.renews_at ??
        (workspace.subscription?.status === 'past_due' ? workspace.subscription?.grace_period_ends_at : null);

    const memberColumns: ColumnsType<AdminWorkspaceMember> = [
        { title: 'Nom', dataIndex: 'name', key: 'name' },
        { title: 'Email', dataIndex: 'email', key: 'email' },
        {
            title: 'Rôle',
            dataIndex: 'role',
            key: 'role',
            align: 'center',
            render: (role: string | null) => (role ? <Tag color={role === 'owner' ? 'gold' : 'default'}>{ROLE_LABELS[role] ?? role}</Tag> : '—'),
        },
    ];

    const failedDeploymentColumns: ColumnsType<AdminFailedDeployment> = [
        {
            title: 'Target / environnement',
            key: 'target',
            render: (_value, deployment) => (
                <span>
                    {deployment.target_name ?? '—'}
                    <br />
                    <small style={{ color: 'var(--color-text-muted)' }}>{deployment.environment_name}</small>
                </span>
            ),
        },
        {
            title: 'Étape en échec',
            key: 'step',
            render: (_value, deployment) =>
                deployment.failed_step ? (
                    <span>
                        {deployment.failed_step.label ?? 'Étape'} (exit {deployment.failed_step.exit_code ?? '?'})
                        <br />
                        <small style={{ color: 'var(--color-text-muted)' }}>
                            {deployment.failed_step.output_excerpt ?? 'Aucune sortie enregistrée.'}
                        </small>
                    </span>
                ) : (
                    '—'
                ),
        },
        {
            title: 'Déclenché',
            key: 'created_at',
            render: (_value, deployment) => timeAgo(deployment.created_at),
        },
        {
            title: '',
            key: 'link',
            align: 'right',
            render: (_value, deployment) => (
                <Button size="small" onClick={() => router.visit(deployment.show_url)}>
                    Voir le détail
                </Button>
            ),
        },
    ];

    const applicationColumns: ColumnsType<AdminApplicationStats> = [
        {
            title: 'Application',
            key: 'name',
            render: (_value, application) => (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Avatar
                        size={24}
                        shape="square"
                        src={application.logo_url ?? undefined}
                        icon={!application.logo_url ? <Building2 size={14} /> : undefined}
                    />
                    <strong>{application.name}</strong>
                </span>
            ),
        },
        {
            title: 'Déploiements',
            dataIndex: 'deployments_total',
            key: 'deployments_total',
            align: 'center',
        },
        {
            title: 'Dernier déploiement',
            key: 'last_deployment_at',
            align: 'center',
            render: (_value, application) => (application.last_deployment_at ? timeAgo(application.last_deployment_at) : '—'),
        },
        {
            title: "Taux d'échec (all-time)",
            key: 'failure_rate',
            align: 'center',
            render: (_value, application) => (
                <span
                    className={`premium-table__status premium-table__status--${application.failure_rate > 20 ? 'danger' : application.failure_rate > 0 ? 'warning' : 'success'}`}
                >
                    {application.failure_rate}% ({application.deployments_failed}/{application.deployments_total})
                </span>
            ),
        },
    ];

    return (
        <AdminLayout
            breadcrumbs={[
                { label: 'Administration', href: route('admin.dashboard') },
                { label: 'Workspaces', href: route('admin.workspaces.index') },
                { label: workspace.name },
            ]}
        >
            <Head title={`Administration — ${workspace.name}`} />

            <div className="premium-list-hero">
                <div>
                    <div className="premium-list-eyebrow">Workspace</div>
                    <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar icon={<Building2 size={16} />} shape="square" />
                        {workspace.name}
                    </Title>
                    <Paragraph type="secondary" style={{ margin: '6px 0 0' }}>
                        {workspace.slug} — créé{' '}
                        {workspace.created_at ? new Date(workspace.created_at).toLocaleDateString('fr-FR') : '—'}
                    </Paragraph>
                    <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span className="admin-field-label" style={{ margin: 0 }}>
                            Owner{owners.length > 1 ? 's' : ''} :
                        </span>
                        {owners.length > 0 ? (
                            owners.map((o) => (
                                <Tag key={o.id} color="gold" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Avatar size={16}>{o.name.charAt(0).toUpperCase()}</Avatar>
                                    {o.name} <small style={{ opacity: 0.75 }}>({o.email})</small>
                                </Tag>
                            ))
                        ) : (
                            <span className="section-hint">Aucun owner</span>
                        )}
                    </div>
                </div>

                <Button
                    danger={!workspace.suspended_at}
                    icon={workspace.suspended_at ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
                    onClick={toggleSuspend}
                >
                    {workspace.suspended_at ? 'Réactiver le workspace' : 'Suspendre le workspace'}
                </Button>
            </div>

            <div className="admin-dashboard-grid">
                <Card title="Aperçu" className="premium-table-card">
                    <Descriptions column={1} size="small">
                        <Descriptions.Item label="Statut">
                            {workspace.suspended_at ? (
                                <span className="premium-table__status premium-table__status--danger">
                                    <ShieldAlert size={14} /> Suspendu le{' '}
                                    {new Date(workspace.suspended_at).toLocaleDateString('fr-FR')}
                                </span>
                            ) : (
                                <span className="premium-table__status premium-table__status--success">
                                    <ShieldCheck size={14} /> Actif
                                </span>
                            )}
                        </Descriptions.Item>
                        <Descriptions.Item label="Plan actuel">
                            {workspace.subscription?.plan ? <Tag color="purple">{workspace.subscription.plan.name}</Tag> : <Tag>Free</Tag>}
                            {isComped && <Tag color="gold">Offert</Tag>}
                        </Descriptions.Item>
                        <Descriptions.Item label="Prochain renouvellement">
                            {renewalDate ? new Date(renewalDate).toLocaleDateString('fr-FR') : '—'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Applications">{applications.length}</Descriptions.Item>
                        <Descriptions.Item label="Membres">
                            <Users size={14} style={{ verticalAlign: -2, marginRight: 4 }} />
                            {members.length}
                        </Descriptions.Item>
                        <Descriptions.Item label="Owner(s)">
                            {owners.length > 0 ? owners.map((o) => <Tag key={o.id}>{o.name}</Tag>) : '—'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Créateur">{workspace.creator?.name ?? '—'}</Descriptions.Item>
                    </Descriptions>
                </Card>

                <Card title="Abonnement" className="premium-table-card">
                    {workspace.subscription ? (
                        <div className="form-stack">
                            <div className="admin-comp-banner">
                                <div>
                                    <strong>Offre gratuite</strong>
                                    <p className="section-hint" style={{ margin: 0 }}>
                                        {isComped
                                            ? 'Ce workspace a le plan Pro offert gratuitement, sans facturation Paddle.'
                                            : 'Accordez le plan Pro gratuitement à ce workspace, sans passer par Paddle.'}
                                    </p>
                                </div>
                                {isComped ? (
                                    <Button danger onClick={revokeFreePro}>
                                        Retirer l&apos;offre
                                    </Button>
                                ) : (
                                    <Button onClick={grantFreePro}>Offrir Pro gratuitement</Button>
                                )}
                            </div>

                            <div>
                                <label className="admin-field-label">Plan</label>
                                <Select
                                    className="w-full"
                                    value={data.plan_id}
                                    onChange={(value) => setData('plan_id', value)}
                                    options={plans.map((p) => ({ value: p.id, label: p.name }))}
                                />
                            </div>
                            <div>
                                <label className="admin-field-label">Statut</label>
                                <Select
                                    className="w-full"
                                    value={data.status}
                                    onChange={(value) => setData('status', value)}
                                    options={STATUS_OPTIONS}
                                />
                            </div>
                            <div className="form-actions form-actions--end">
                                <Button type="primary" loading={processing} onClick={submitSubscription}>
                                    Enregistrer
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <Empty description="Aucun abonnement pour ce workspace" />
                    )}
                </Card>
            </div>

            <Card className="premium-table-card" style={{ marginTop: 16 }} styles={{ body: { padding: 0 } }}>
                <Tabs
                    defaultActiveKey="members"
                    style={{ padding: '0 16px' }}
                    items={[
                        {
                            key: 'members',
                            label: `Membres (${members.length})`,
                            children: members.length > 0 ? (
                                <Table
                                    rowKey="id"
                                    dataSource={members}
                                    columns={memberColumns}
                                    className="premium-table"
                                    pagination={{ pageSize: 10, hideOnSinglePage: true }}
                                    scroll={{ x: 'max-content' }}
                                />
                            ) : (
                                <Empty description="Aucun membre" style={{ padding: 24 }} />
                            ),
                        },
                        {
                            key: 'applications',
                            label: `Applications & déploiements (${applications.length})`,
                            children: applications.length > 0 ? (
                                <Table
                                    rowKey="id"
                                    dataSource={applications}
                                    columns={applicationColumns}
                                    className="premium-table"
                                    pagination={{ pageSize: 10, hideOnSinglePage: true }}
                                    scroll={{ x: 'max-content' }}
                                    expandable={{
                                        rowExpandable: (application) => application.recent_failed_deployments.length > 0,
                                        expandedRowRender: (application) => (
                                            <Table
                                                rowKey="id"
                                                dataSource={application.recent_failed_deployments}
                                                columns={failedDeploymentColumns}
                                                pagination={false}
                                                size="small"
                                                className="premium-table"
                                                scroll={{ x: 'max-content' }}
                                            />
                                        ),
                                    }}
                                />
                            ) : (
                                <Empty description="Aucune application" style={{ padding: 24 }} />
                            ),
                        },
                        {
                            key: 'subscription-history',
                            label: `Historique abonnement (${subscriptionHistory.length})`,
                            children:
                                subscriptionHistory.length > 0 ? (
                                    <div style={{ padding: '16px 8px' }}>
                                        <Timeline
                                            items={subscriptionHistory.map((entry) => ({
                                                color:
                                                    entry.status === 'active' ? 'green' : entry.status === 'past_due' ? 'orange' : 'red',
                                                children: (
                                                    <div>
                                                        <Text strong>{entry.plan?.name ?? 'Plan inconnu'}</Text>{' '}
                                                        <Tag
                                                            color={
                                                                entry.status === 'active' ? 'green' : entry.status === 'past_due' ? 'orange' : 'red'
                                                            }
                                                        >
                                                            {entry.status}
                                                        </Tag>
                                                        <br />
                                                        <small style={{ color: 'var(--color-text-muted)' }}>
                                                            {new Date(entry.created_at).toLocaleString('fr-FR')} —{' '}
                                                            {SOURCE_LABELS[entry.source] ?? entry.source}
                                                            {entry.source === 'admin' && entry.changed_by ? ` (${entry.changed_by.name})` : ''}
                                                        </small>
                                                        {entry.note && (
                                                            <>
                                                                <br />
                                                                <small style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                                                                    {entry.note}
                                                                </small>
                                                            </>
                                                        )}
                                                    </div>
                                                ),
                                            }))}
                                        />
                                    </div>
                                ) : (
                                    <Empty
                                        description="Aucun historique disponible avant l'activation de ce suivi"
                                        style={{ padding: 24 }}
                                    />
                                ),
                        },
                    ]}
                />
            </Card>
        </AdminLayout>
    );
}
