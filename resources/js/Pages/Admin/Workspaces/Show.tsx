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
import { Avatar, Button, Card, Descriptions, Empty, Input, Modal, Select, Table, Tabs, Tag, Timeline, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { AlertTriangle, Boxes, Building2, Rocket, Server as ServerIcon, ShieldAlert, ShieldCheck, Trash2, Users } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { dateLocale } from '@/lib/i18n';

const { Title, Paragraph, Text } = Typography;

const STATUS_VALUES = ['active', 'past_due', 'canceled'] as const;

export default function Show({
    workspace,
    members,
    owners,
    applications,
    subscriptionHistory,
    plans,
    serversCount,
    deploymentsCount,
}: {
    workspace: AdminWorkspace;
    members: AdminWorkspaceMember[];
    owners: AdminWorkspaceMember[];
    applications: AdminApplicationStats[];
    subscriptionHistory: SubscriptionHistoryEntry[];
    plans: Plan[];
    serversCount: number;
    deploymentsCount: number;
}) {
    const { t, i18n } = useTranslation('admin');
    const confirm = useConfirm();
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [deleting, setDeleting] = useState(false);

    const closeDeleteModal = () => {
        setDeleteModalOpen(false);
        setDeleteConfirmText('');
    };

    const deleteWorkspace = () => {
        setDeleting(true);
        router.delete(route('admin.workspaces.destroy', workspace.slug), {
            onSuccess: closeDeleteModal,
            onFinish: () => setDeleting(false),
        });
    };
    const { data, setData, patch, processing } = useForm({
        plan_id: workspace.subscription?.plan_id ?? undefined,
        status: workspace.subscription?.status ?? undefined,
    });

    const toggleSuspend = () => {
        if (workspace.suspended_at) {
            confirm.confirm({
                title: t('workspacesShow.confirmReactivate.title', { name: workspace.name }),
                okText: t('workspacesShow.confirmReactivate.okText'),
                cancelText: t('workspacesShow.confirmReactivate.cancelText'),
                onOk: () => router.post(route('admin.workspaces.reactivate', workspace.slug)),
            });
        } else {
            confirm.confirm({
                title: t('workspacesShow.confirmSuspend.title', { name: workspace.name }),
                content: t('workspacesShow.confirmSuspend.content'),
                okType: 'danger',
                okText: t('workspacesShow.confirmSuspend.okText'),
                cancelText: t('workspacesShow.confirmSuspend.cancelText'),
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
            title: t('workspacesShow.confirmGrantFreePro.title', { name: workspace.name }),
            content: t('workspacesShow.confirmGrantFreePro.content'),
            okText: t('workspacesShow.confirmGrantFreePro.okText'),
            cancelText: t('workspacesShow.confirmGrantFreePro.cancelText'),
            onOk: () => router.post(route('admin.workspaces.subscription.grant-free', workspace.slug)),
        });
    };

    const revokeFreePro = () => {
        confirm.confirm({
            title: t('workspacesShow.confirmRevokeFreePro.title', { name: workspace.name }),
            content: t('workspacesShow.confirmRevokeFreePro.content'),
            okType: 'danger',
            okText: t('workspacesShow.confirmRevokeFreePro.okText'),
            cancelText: t('workspacesShow.confirmRevokeFreePro.cancelText'),
            onOk: () => router.post(route('admin.workspaces.subscription.revoke-free', workspace.slug)),
        });
    };

    const renewalDate =
        workspace.subscription?.renews_at ??
        (workspace.subscription?.status === 'past_due' ? workspace.subscription?.grace_period_ends_at : null);

    const memberColumns: ColumnsType<AdminWorkspaceMember> = [
        { title: t('workspacesShow.membersColumns.name'), dataIndex: 'name', key: 'name' },
        { title: t('workspacesShow.membersColumns.email'), dataIndex: 'email', key: 'email' },
        {
            title: t('workspacesShow.membersColumns.role'),
            dataIndex: 'role',
            key: 'role',
            align: 'center',
            render: (role: string | null) => (role ? <Tag color={role === 'owner' ? 'gold' : 'default'}>{t(`roles.${role}`, { defaultValue: role })}</Tag> : '—'),
        },
    ];

    const failedDeploymentColumns: ColumnsType<AdminFailedDeployment> = [
        {
            title: t('workspacesShow.failedDeploymentColumns.target'),
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
            title: t('workspacesShow.failedDeploymentColumns.step'),
            key: 'step',
            render: (_value, deployment) =>
                deployment.failed_step ? (
                    <span>
                        {deployment.failed_step.label ?? t('workspacesShow.failedDeploymentColumns.stepFallback')} (exit {deployment.failed_step.exit_code ?? '?'})
                        <br />
                        <small style={{ color: 'var(--color-text-muted)' }}>
                            {deployment.failed_step.output_excerpt ?? t('workspacesShow.failedDeploymentColumns.noOutput')}
                        </small>
                    </span>
                ) : (
                    '—'
                ),
        },
        {
            title: t('workspacesShow.failedDeploymentColumns.triggered'),
            key: 'created_at',
            render: (_value, deployment) => timeAgo(deployment.created_at, t),
        },
        {
            title: '',
            key: 'link',
            align: 'right',
            render: (_value, deployment) => (
                <Button size="small" onClick={() => router.visit(deployment.show_url)}>
                    {t('workspacesShow.failedDeploymentColumns.viewDetail')}
                </Button>
            ),
        },
    ];

    const applicationColumns: ColumnsType<AdminApplicationStats> = [
        {
            title: t('workspacesShow.applicationColumns.name'),
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
            title: t('workspacesShow.applicationColumns.deployments'),
            dataIndex: 'deployments_total',
            key: 'deployments_total',
            align: 'center',
        },
        {
            title: t('workspacesShow.applicationColumns.lastDeployment'),
            key: 'last_deployment_at',
            align: 'center',
            render: (_value, application) => (application.last_deployment_at ? timeAgo(application.last_deployment_at, t) : '—'),
        },
        {
            title: t('workspacesShow.applicationColumns.failureRate'),
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
                { label: t('layout.breadcrumbFallback'), href: route('admin.dashboard') },
                { label: t('layout.nav.workspaces'), href: route('admin.workspaces.index') },
                { label: workspace.name },
            ]}
        >
            <Head title={t('workspacesShow.title', { name: workspace.name })} />

            <div className="premium-list-hero">
                <div>
                    <div className="premium-list-eyebrow">{t('workspacesShow.eyebrow')}</div>
                    <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar icon={<Building2 size={16} />} shape="square" />
                        {workspace.name}
                    </Title>
                    <Paragraph type="secondary" style={{ margin: '6px 0 0' }}>
                        {t('workspacesShow.createdAt', {
                            slug: workspace.slug,
                            date: workspace.created_at ? new Date(workspace.created_at).toLocaleDateString(dateLocale(i18n.language)) : '—',
                        })}
                    </Paragraph>
                    <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span className="admin-field-label" style={{ margin: 0 }}>
                            {t('workspacesShow.owner', { count: owners.length || 1 })}
                        </span>
                        {owners.length > 0 ? (
                            owners.map((o) => (
                                <Tag key={o.id} color="gold" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Avatar size={16}>{o.name.charAt(0).toUpperCase()}</Avatar>
                                    {o.name} <small style={{ opacity: 0.75 }}>({o.email})</small>
                                </Tag>
                            ))
                        ) : (
                            <span className="section-hint">{t('workspacesShow.noOwner')}</span>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                    <Button
                        danger={!workspace.suspended_at}
                        icon={workspace.suspended_at ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
                        onClick={toggleSuspend}
                    >
                        {workspace.suspended_at ? t('workspacesShow.reactivateWorkspace') : t('workspacesShow.suspendWorkspace')}
                    </Button>
                    <Button danger icon={<Trash2 size={14} />} onClick={() => setDeleteModalOpen(true)}>
                        {t('workspacesShow.deleteWorkspace')}
                    </Button>
                </div>
            </div>

            <div className="admin-dashboard-grid">
                <Card title={t('workspacesShow.overview.cardTitle')} className="premium-table-card">
                    <Descriptions column={1} size="small">
                        <Descriptions.Item label={t('workspacesShow.overview.status')}>
                            {workspace.suspended_at ? (
                                <span className="premium-table__status premium-table__status--danger">
                                    <ShieldAlert size={14} />{' '}
                                    {t('workspacesShow.overview.suspendedSince', {
                                        date: new Date(workspace.suspended_at).toLocaleDateString(dateLocale(i18n.language)),
                                    })}
                                </span>
                            ) : (
                                <span className="premium-table__status premium-table__status--success">
                                    <ShieldCheck size={14} /> {t('workspacesShow.overview.active')}
                                </span>
                            )}
                        </Descriptions.Item>
                        <Descriptions.Item label={t('workspacesShow.overview.currentPlan')}>
                            {workspace.subscription?.plan ? <Tag color="purple">{workspace.subscription.plan.name}</Tag> : <Tag>{t('workspacesShow.overview.free')}</Tag>}
                            {isComped && <Tag color="gold">{t('workspacesShow.overview.comped')}</Tag>}
                        </Descriptions.Item>
                        <Descriptions.Item label={t('workspacesShow.overview.nextRenewal')}>
                            {renewalDate ? new Date(renewalDate).toLocaleDateString(dateLocale(i18n.language)) : '—'}
                        </Descriptions.Item>
                        <Descriptions.Item label={t('workspacesShow.overview.applications')}>{applications.length}</Descriptions.Item>
                        <Descriptions.Item label={t('workspacesShow.overview.members')}>
                            <Users size={14} style={{ verticalAlign: -2, marginRight: 4 }} />
                            {members.length}
                        </Descriptions.Item>
                        <Descriptions.Item label={t('workspacesShow.overview.owners')}>
                            {owners.length > 0 ? owners.map((o) => <Tag key={o.id}>{o.name}</Tag>) : '—'}
                        </Descriptions.Item>
                        <Descriptions.Item label={t('workspacesShow.overview.creator')}>{workspace.creator?.name ?? '—'}</Descriptions.Item>
                    </Descriptions>
                </Card>

                <Card title={t('workspacesShow.subscription.cardTitle')} className="premium-table-card">
                    {workspace.subscription ? (
                        <div className="form-stack">
                            <div className="admin-comp-banner">
                                <div>
                                    <strong>{t('workspacesShow.subscription.freeOfferTitle')}</strong>
                                    <p className="section-hint" style={{ margin: 0 }}>
                                        {isComped
                                            ? t('workspacesShow.subscription.compedDescription')
                                            : t('workspacesShow.subscription.notCompedDescription')}
                                    </p>
                                </div>
                                {isComped ? (
                                    <Button danger onClick={revokeFreePro}>
                                        {t('workspacesShow.subscription.revokeOffer')}
                                    </Button>
                                ) : (
                                    <Button onClick={grantFreePro}>{t('workspacesShow.subscription.grantFreePro')}</Button>
                                )}
                            </div>

                            <div>
                                <label className="admin-field-label">{t('workspacesShow.subscription.planLabel')}</label>
                                <Select
                                    className="w-full"
                                    value={data.plan_id}
                                    onChange={(value) => setData('plan_id', value)}
                                    options={plans.map((p) => ({ value: p.id, label: p.name }))}
                                />
                            </div>
                            <div>
                                <label className="admin-field-label">{t('workspacesShow.subscription.statusLabel')}</label>
                                <Select
                                    className="w-full"
                                    value={data.status}
                                    onChange={(value) => setData('status', value)}
                                    options={STATUS_VALUES.map((value) => ({ value, label: t(`subscriptionStatuses.${value}`) }))}
                                />
                            </div>
                            <div className="form-actions form-actions--end">
                                <Button type="primary" loading={processing} onClick={submitSubscription}>
                                    {t('workspacesShow.subscription.save')}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <Empty description={t('workspacesShow.subscription.empty')} />
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
                            label: t('workspacesShow.tabs.members', { count: members.length }),
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
                                <Empty description={t('workspacesShow.tabs.membersEmpty')} style={{ padding: 24 }} />
                            ),
                        },
                        {
                            key: 'applications',
                            label: t('workspacesShow.tabs.applications', { count: applications.length }),
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
                                <Empty description={t('workspacesShow.tabs.applicationsEmpty')} style={{ padding: 24 }} />
                            ),
                        },
                        {
                            key: 'subscription-history',
                            label: t('workspacesShow.tabs.subscriptionHistory', { count: subscriptionHistory.length }),
                            children:
                                subscriptionHistory.length > 0 ? (
                                    <div style={{ padding: '16px 8px' }}>
                                        <Timeline
                                            items={subscriptionHistory.map((entry) => ({
                                                color:
                                                    entry.status === 'active' ? 'green' : entry.status === 'past_due' ? 'orange' : 'red',
                                                children: (
                                                    <div>
                                                        <Text strong>{entry.plan?.name ?? t('workspacesShow.tabs.unknownPlan')}</Text>{' '}
                                                        <Tag
                                                            color={
                                                                entry.status === 'active' ? 'green' : entry.status === 'past_due' ? 'orange' : 'red'
                                                            }
                                                        >
                                                            {entry.status}
                                                        </Tag>
                                                        <br />
                                                        <small style={{ color: 'var(--color-text-muted)' }}>
                                                            {new Date(entry.created_at).toLocaleString(dateLocale(i18n.language))} —{' '}
                                                            {t(`subscriptionSources.${entry.source}`, { defaultValue: entry.source })}
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
                                        description={t('workspacesShow.tabs.subscriptionHistoryEmpty')}
                                        style={{ padding: 24 }}
                                    />
                                ),
                        },
                    ]}
                />
            </Card>

            <Modal
                open={deleteModalOpen}
                onCancel={closeDeleteModal}
                title={
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-danger)' }}>
                        <AlertTriangle size={16} /> {t('workspacesShow.deleteModal.title', { name: workspace.name })}
                    </span>
                }
                footer={
                    <div className="form-actions form-actions--end">
                        <Button onClick={closeDeleteModal}>{t('workspacesShow.deleteModal.cancel')}</Button>
                        <Button
                            danger
                            type="primary"
                            loading={deleting}
                            disabled={deleteConfirmText !== workspace.slug}
                            onClick={deleteWorkspace}
                        >
                            {t('workspacesShow.deleteModal.confirmDelete')}
                        </Button>
                    </div>
                }
            >
                <Paragraph>
                    {t('workspacesShow.deleteModal.introBefore')}
                    <strong>{t('workspacesShow.deleteModal.introBold')}</strong>
                    {t('workspacesShow.deleteModal.introAfter')}
                </Paragraph>

                <Descriptions column={1} size="small" bordered style={{ marginBottom: 16 }}>
                    <Descriptions.Item label={<span><Users size={13} style={{ verticalAlign: -2, marginRight: 6 }} />{t('workspacesShow.deleteModal.labels.members')}</span>}>
                        {t('workspacesShow.deleteModal.members', { count: members.length })}
                        {owners.length > 0 &&
                            t('workspacesShow.deleteModal.membersWithOwners', { count: owners.length, plural: owners.length > 1 ? 's' : '' })}
                    </Descriptions.Item>
                    <Descriptions.Item label={<span><Boxes size={13} style={{ verticalAlign: -2, marginRight: 6 }} />{t('workspacesShow.deleteModal.labels.applications')}</span>}>
                        {t('workspacesShow.deleteModal.applications', { count: applications.length })}
                    </Descriptions.Item>
                    <Descriptions.Item label={<span><ServerIcon size={13} style={{ verticalAlign: -2, marginRight: 6 }} />{t('workspacesShow.deleteModal.labels.servers')}</span>}>
                        {t('workspacesShow.deleteModal.servers', { count: serversCount })}
                    </Descriptions.Item>
                    <Descriptions.Item label={<span><Rocket size={13} style={{ verticalAlign: -2, marginRight: 6 }} />{t('workspacesShow.deleteModal.labels.deployments')}</span>}>
                        {t('workspacesShow.deleteModal.deploymentsHistory', { count: deploymentsCount })}
                    </Descriptions.Item>
                    <Descriptions.Item label={t('workspacesShow.deleteModal.labels.subscription')}>
                        {workspace.subscription
                            ? t('workspacesShow.deleteModal.subscriptionWithPlan', { plan: workspace.subscription.plan?.name ?? t('workspacesShow.overview.free') })
                            : t('workspacesShow.deleteModal.noSubscription')}
                    </Descriptions.Item>
                </Descriptions>

                <Paragraph>
                    {t('workspacesShow.deleteModal.confirmPromptBefore')}
                    <Text code>{workspace.slug}</Text>
                    {t('workspacesShow.deleteModal.confirmPromptAfter')}
                </Paragraph>
                <Input
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder={workspace.slug}
                    onPressEnter={() => {
                        if (deleteConfirmText === workspace.slug) deleteWorkspace();
                    }}
                />
            </Modal>
        </AdminLayout>
    );
}
