import AdminLayout from '@/Layouts/AdminLayout';
import StatusTag from '@/Components/StatusTag';
import { useConfirm } from '@/theme/ConfirmContext';
import { dateLocale } from '@/lib/i18n';
import { User } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { Avatar, Button, Card, Descriptions, Empty, Table, Tabs, Tag, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckCircle2, ShieldAlert, ShieldCheck, ShieldOff, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageProps } from '@/types';

const { Title, Paragraph, Text } = Typography;

interface RecentDeployment {
    uuid: string;
    status: string;
    created_at: string;
    application_name: string;
    workspace_name: string;
    workspace_slug: string;
}

interface AuditLogEntry {
    action: string;
    user_id: number | null;
    user?: { name: string; email: string } | null;
    changes: Record<string, unknown> | null;
    ip_address: string | null;
    created_at: string;
}

export default function Show({
    user,
    recentDeployments,
    auditLogs,
}: {
    user: User;
    recentDeployments: RecentDeployment[];
    auditLogs: AuditLogEntry[];
}) {
    const { t, i18n } = useTranslation('admin');
    const { auth } = usePage<PageProps>().props;
    const confirm = useConfirm();
    const isSelf = user.id === auth.user.id;
    const locale = dateLocale(i18n.language);

    const suspend = () => {
        confirm.confirm({
            title: t('usersShow.confirmSuspend.title', { name: user.name }),
            content: t('usersShow.confirmSuspend.content'),
            okType: 'danger',
            okText: t('usersShow.confirmSuspend.okText'),
            cancelText: t('usersShow.confirmSuspend.cancelText'),
            onOk: () => router.post(route('admin.users.suspend', user.uuid)),
        });
    };

    const reactivate = () => {
        confirm.confirm({
            title: t('usersShow.confirmReactivate.title', { name: user.name }),
            okText: t('usersShow.confirmReactivate.okText'),
            cancelText: t('usersShow.confirmReactivate.cancelText'),
            onOk: () => router.post(route('admin.users.reactivate', user.uuid)),
        });
    };

    const promote = () => {
        confirm.confirm({
            title: t('usersComponent.confirmPromote.title', { name: user.name }),
            content: t('usersComponent.confirmPromote.content'),
            okText: t('usersComponent.confirmPromote.okText'),
            cancelText: t('usersComponent.confirmPromote.cancelText'),
            onOk: () => router.post(route('admin.users.promote', user.uuid)),
        });
    };

    const demote = () => {
        confirm.confirm({
            title: t('usersComponent.confirmDemote.title', { name: user.name }),
            okType: 'danger',
            okText: t('usersComponent.confirmDemote.okText'),
            cancelText: t('usersComponent.confirmDemote.cancelText'),
            onOk: () => router.post(route('admin.users.demote', user.uuid)),
        });
    };

    const destroy = () => {
        confirm.confirm({
            title: t('usersShow.confirmDelete.title', { name: user.name }),
            content: t('usersShow.confirmDelete.content'),
            okType: 'danger',
            okText: t('usersShow.confirmDelete.okText'),
            cancelText: t('usersShow.confirmDelete.cancelText'),
            onOk: () => router.delete(route('admin.users.destroy', user.uuid)),
        });
    };

    const deploymentColumns: ColumnsType<RecentDeployment> = [
        {
            title: t('usersShow.deployments.colDate'),
            key: 'created_at',
            width: 170,
            render: (_, row) => new Date(row.created_at).toLocaleString(locale),
        },
        {
            title: t('usersShow.deployments.colWorkspace'),
            dataIndex: 'workspace_name',
            key: 'workspace_name',
        },
        {
            title: t('usersShow.deployments.colApplication'),
            dataIndex: 'application_name',
            key: 'application_name',
        },
        {
            title: t('usersShow.deployments.colStatus'),
            key: 'status',
            width: 120,
            render: (_, row) => <StatusTag status={row.status} />,
        },
    ];

    const auditColumns: ColumnsType<AuditLogEntry> = [
        {
            title: t('usersShow.audit.colDate'),
            key: 'created_at',
            width: 170,
            render: (_, row) => new Date(row.created_at).toLocaleString(locale),
        },
        {
            title: t('usersShow.audit.colAction'),
            dataIndex: 'action',
            key: 'action',
            render: (action) => <code style={{ fontSize: 12 }}>{action}</code>,
        },
        {
            title: t('usersShow.audit.colBy'),
            key: 'by',
            width: 180,
            render: (_, row) => row.user ? (
                <Tooltip title={row.user.email}>
                    <span>{row.user.name}</span>
                </Tooltip>
            ) : '—',
        },
        {
            title: t('usersShow.audit.colIp'),
            dataIndex: 'ip_address',
            key: 'ip_address',
            width: 130,
            render: (ip) => ip ?? '—',
        },
    ];

    const workspaces = user.workspaces ?? [];

    return (
        <AdminLayout
            breadcrumbs={[
                { label: t('layout.breadcrumbFallback'), href: route('admin.dashboard') },
                { label: t('layout.nav.users'), href: route('admin.users.index') },
                { label: user.name },
            ]}
        >
            <Head title={t('usersShow.title', { name: user.name })} />

            <div className="premium-list-hero">
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0, flex: 1 }}>
                    <Avatar size={56} style={{ flexShrink: 0, fontSize: 22 }}>
                        {user.name.charAt(0).toUpperCase()}
                    </Avatar>
                    <div style={{ minWidth: 0 }}>
                        <div className="premium-list-eyebrow">{t('usersShow.eyebrow')}</div>
                        <Title level={2} style={{ margin: 0 }}>{user.name}</Title>
                        <Text type="secondary">{user.email}</Text>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    {user.suspended_at ? (
                        <Button icon={<CheckCircle2 size={14} />} onClick={reactivate} disabled={isSelf}>
                            {t('usersShow.actions.reactivate')}
                        </Button>
                    ) : (
                        <Button danger icon={<ShieldAlert size={14} />} onClick={suspend} disabled={isSelf}>
                            {t('usersShow.actions.suspend')}
                        </Button>
                    )}

                    {user.is_super_admin ? (
                        <Tooltip title={isSelf ? t('usersComponent.columns.cannotDemoteSelf') : undefined}>
                            <Button danger icon={<ShieldOff size={14} />} onClick={demote} disabled={isSelf}>
                                {t('usersShow.actions.demote')}
                            </Button>
                        </Tooltip>
                    ) : (
                        <Button icon={<ShieldCheck size={14} />} onClick={promote}>
                            {t('usersShow.actions.promote')}
                        </Button>
                    )}

                    <Tooltip title={isSelf ? t('usersComponent.columns.cannotDemoteSelf') : undefined}>
                        <Button danger icon={<Trash2 size={14} />} onClick={destroy} disabled={isSelf}>
                            {t('usersShow.actions.delete')}
                        </Button>
                    </Tooltip>
                </div>
            </div>

            <Tabs
                style={{ marginTop: 24 }}
                items={[
                    {
                        key: 'profile',
                        label: t('usersShow.tabProfile'),
                        children: (
                            <Card className="premium-table-card">
                                <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
                                    <Descriptions.Item label={t('usersShow.profile.name')}>{user.name}</Descriptions.Item>
                                    <Descriptions.Item label={t('usersShow.profile.email')}>{user.email}</Descriptions.Item>
                                    <Descriptions.Item label={t('usersShow.profile.status')}>
                                        {user.suspended_at ? (
                                            <span className="premium-table__status premium-table__status--danger">
                                                <ShieldAlert size={14} /> {t('usersComponent.columns.suspended')}
                                            </span>
                                        ) : (
                                            <span className="premium-table__status premium-table__status--success">
                                                <CheckCircle2 size={14} /> {t('usersComponent.columns.active')}
                                            </span>
                                        )}
                                    </Descriptions.Item>
                                    <Descriptions.Item label={t('usersShow.profile.superAdmin')}>
                                        {user.is_super_admin ? (
                                            <span className="premium-table__status premium-table__status--success">
                                                <ShieldCheck size={14} /> {t('usersComponent.columns.yes')}
                                            </span>
                                        ) : (
                                            <Text type="secondary">{t('usersComponent.columns.no')}</Text>
                                        )}
                                    </Descriptions.Item>
                                    <Descriptions.Item label={t('usersShow.profile.provider')}>
                                        {user.google_id
                                            ? t('usersShow.profile.providerGoogle')
                                            : t('usersShow.profile.providerPassword')}
                                    </Descriptions.Item>
                                    <Descriptions.Item label={t('usersShow.profile.registration')}>
                                        {user.created_at ? new Date(user.created_at).toLocaleString(locale) : '—'}
                                    </Descriptions.Item>
                                    <Descriptions.Item label={t('usersShow.profile.lastActive')}>
                                        {user.last_active_at ? new Date(user.last_active_at).toLocaleString(locale) : '—'}
                                    </Descriptions.Item>
                                    <Descriptions.Item label={t('usersShow.profile.workspaces')} span={2}>
                                        {workspaces.length === 0 ? (
                                            <Text type="secondary">{t('usersShow.profile.noWorkspaces')}</Text>
                                        ) : (
                                            <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 6 }}>
                                                {workspaces.map((ws) => (
                                                    <Tag key={ws.id} color={ws.role === 'owner' ? 'gold' : 'default'}>
                                                        {ws.name}
                                                        {ws.role && (
                                                            <Text type="secondary" style={{ marginLeft: 4, fontSize: 11 }}>
                                                                · {t(`roles.${ws.role}`, { defaultValue: ws.role })}
                                                            </Text>
                                                        )}
                                                    </Tag>
                                                ))}
                                            </span>
                                        )}
                                    </Descriptions.Item>
                                </Descriptions>
                            </Card>
                        ),
                    },
                    {
                        key: 'deployments',
                        label: t('usersShow.tabDeployments'),
                        children: (
                            <Card className="premium-table-card">
                                {recentDeployments.length === 0 ? (
                                    <Empty description={t('usersShow.deployments.noDeployments')} />
                                ) : (
                                    <Table
                                        rowKey="uuid"
                                        dataSource={recentDeployments}
                                        columns={deploymentColumns}
                                        pagination={false}
                                        className="premium-table"
                                        size="small"
                                    />
                                )}
                            </Card>
                        ),
                    },
                    {
                        key: 'audit',
                        label: t('usersShow.tabAudit'),
                        children: (
                            <Card className="premium-table-card">
                                {auditLogs.length === 0 ? (
                                    <Empty description={t('usersShow.audit.noLogs')} />
                                ) : (
                                    <Table
                                        rowKey={(r) => r.action + r.created_at}
                                        dataSource={auditLogs}
                                        columns={auditColumns}
                                        pagination={false}
                                        className="premium-table"
                                        size="small"
                                    />
                                )}
                            </Card>
                        ),
                    },
                ]}
            />
        </AdminLayout>
    );
}
