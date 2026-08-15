import KpiCollapse from '@/Components/KpiCollapse';
import ListToolbar from '@/Components/ListToolbar';
import { useConfirm } from '@/theme/ConfirmContext';
import { useListSearch } from '@/hooks/useListSearch';
import { PageProps, User } from '@/types';
import { router, usePage } from '@inertiajs/react';
import { Avatar, Button, Card, Popover, Spin, Table, Tag, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckCircle2, ShieldAlert, ShieldCheck, ShieldOff, Users as UsersIcon } from 'lucide-react';
import { forwardRef, useImperativeHandle } from 'react';
import { useTranslation } from 'react-i18next';
import { dateLocale } from '@/lib/i18n';

const WORKSPACE_TAGS_VISIBLE = 2;

export interface AdminUserKpis {
    total: number;
    suspended: number;
    super_admins: number;
}

export interface AdminUsersListHandle {
    refresh: () => void;
}

export default forwardRef<AdminUsersListHandle, {
    searchUrl: string;
    initialItems: User[];
    initialKpis: AdminUserKpis;
}>(function AdminUsersList({ searchUrl, initialItems, initialKpis }, ref) {
    const { t, i18n } = useTranslation('admin');
    const { auth } = usePage<PageProps>().props;
    const confirm = useConfirm();
    const search = useListSearch<User, AdminUserKpis>(searchUrl, initialItems, initialKpis, {
        sort: 'name',
        direction: 'asc',
    });

    useImperativeHandle(ref, () => ({ refresh: search.refresh }), [search.refresh]);

    const STATUS_FILTER_OPTIONS = [
        { value: 'active', label: t('usersComponent.statusFilters.active') },
        { value: 'suspended', label: t('usersComponent.statusFilters.suspended') },
        { value: 'super_admin', label: t('usersComponent.statusFilters.superAdmin') },
    ];

    const promote = (user: User) => {
        confirm.confirm({
            title: t('usersComponent.confirmPromote.title', { name: user.name }),
            content: t('usersComponent.confirmPromote.content'),
            okText: t('usersComponent.confirmPromote.okText'),
            cancelText: t('usersComponent.confirmPromote.cancelText'),
            onOk: () => {
                router.post(route('admin.users.promote', user.uuid), {}, { onSuccess: () => search.refresh() });
            },
        });
    };

    const demote = (user: User) => {
        confirm.confirm({
            title: t('usersComponent.confirmDemote.title', { name: user.name }),
            okType: 'danger',
            okText: t('usersComponent.confirmDemote.okText'),
            cancelText: t('usersComponent.confirmDemote.cancelText'),
            onOk: () => {
                router.post(route('admin.users.demote', user.uuid), {}, { onSuccess: () => search.refresh() });
            },
        });
    };

    const columns: ColumnsType<User> = [
        {
            title: t('usersComponent.columns.user'),
            key: 'user',
            fixed: 'left',
            width: 260,
            render: (_value, user) => (
                <div className="premium-table__name" title={`${user.name} (${user.email})`}>
                    <Avatar size={40}>{user.name.charAt(0).toUpperCase()}</Avatar>
                    <span>
                        <strong>{user.name}</strong>
                        <small>{user.email}</small>
                    </span>
                </div>
            ),
        },
        {
            title: t('usersComponent.columns.workspaces'),
            key: 'workspaces',
            width: 280,
            render: (_value, user) => {
                const workspaces = user.workspaces ?? [];

                if (workspaces.length === 0) {
                    return <span className="section-hint">{t('usersComponent.columns.noWorkspaces')}</span>;
                }

                const visible = workspaces.slice(0, WORKSPACE_TAGS_VISIBLE);
                const overflow = workspaces.slice(WORKSPACE_TAGS_VISIBLE);

                return (
                    <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4 }}>
                        {visible.map((workspace) => (
                            <Tooltip
                                key={workspace.id}
                                title={
                                    workspace.role
                                        ? t('usersComponent.columns.roleTooltip', { role: t(`roles.${workspace.role}`, { defaultValue: workspace.role }) })
                                        : undefined
                                }
                            >
                                <Tag color={workspace.role === 'owner' ? 'gold' : 'default'} style={{ marginInlineEnd: 0 }}>
                                    {workspace.name}
                                </Tag>
                            </Tooltip>
                        ))}
                        {overflow.length > 0 && (
                            <Popover
                                title={t('usersComponent.columns.otherWorkspaces')}
                                content={
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 220 }}>
                                        {overflow.map((workspace) => (
                                            <span key={workspace.id}>
                                                <Tag color={workspace.role === 'owner' ? 'gold' : 'default'} style={{ marginInlineEnd: 6 }}>
                                                    {workspace.name}
                                                </Tag>
                                                <small style={{ color: 'var(--color-text-muted)' }}>
                                                    {workspace.role ? t(`roles.${workspace.role}`, { defaultValue: workspace.role }) : ''}
                                                </small>
                                            </span>
                                        ))}
                                    </div>
                                }
                            >
                                <Tag style={{ cursor: 'pointer', marginInlineEnd: 0 }}>+{overflow.length}</Tag>
                            </Popover>
                        )}
                    </span>
                );
            },
        },
        {
            title: t('usersComponent.columns.status'),
            key: 'status',
            align: 'center',
            width: 120,
            render: (_value, user) =>
                user.suspended_at ? (
                    <span className="premium-table__status premium-table__status--danger">
                        <ShieldAlert size={16} /> {t('usersComponent.columns.suspended')}
                    </span>
                ) : (
                    <span className="premium-table__status premium-table__status--success">
                        <CheckCircle2 size={16} /> {t('usersComponent.columns.active')}
                    </span>
                ),
        },
        {
            title: t('usersComponent.columns.superAdmin'),
            key: 'super_admin',
            align: 'center',
            width: 130,
            render: (_value, user) =>
                user.is_super_admin ? (
                    <span className="premium-table__status premium-table__status--success">
                        <ShieldCheck size={16} /> {t('usersComponent.columns.yes')}
                    </span>
                ) : (
                    <span className="premium-table__status premium-table__status--muted">{t('usersComponent.columns.no')}</span>
                ),
        },
        {
            title: t('usersComponent.columns.registration'),
            key: 'created_at',
            width: 130,
            render: (_value, user) => (user.created_at ? new Date(user.created_at).toLocaleDateString(dateLocale(i18n.language)) : '—'),
        },
        {
            title: t('usersComponent.columns.action'),
            key: 'action',
            align: 'right',
            fixed: 'right',
            width: 160,
            render: (_value, user) => {
                const isSelf = user.id === auth.user.id;

                return user.is_super_admin ? (
                    <Tooltip title={isSelf ? t('usersComponent.columns.cannotDemoteSelf') : undefined}>
                        <Button
                            size="small"
                            danger
                            disabled={isSelf}
                            icon={<ShieldOff size={14} />}
                            onClick={() => demote(user)}
                        >
                            {t('usersComponent.columns.demote')}
                        </Button>
                    </Tooltip>
                ) : (
                    <Button size="small" icon={<ShieldCheck size={14} />} onClick={() => promote(user)}>
                        {t('usersComponent.columns.promote')}
                    </Button>
                );
            },
        },
    ];

    const tableWidth = 260 + 280 + 120 + 130 + 130 + 160;

    return (
        <div>
            <KpiCollapse
                title={t('usersComponent.kpiTitle')}
                subtitle={t('usersComponent.kpiSubtitle')}
                items={[
                    { key: 'total', title: t('usersComponent.kpis.total'), value: search.kpis.total, icon: <UsersIcon size={14} /> },
                    { key: 'suspended', title: t('usersComponent.kpis.suspended'), value: search.kpis.suspended, icon: <ShieldAlert size={14} /> },
                    { key: 'super_admins', title: t('usersComponent.kpis.superAdmins'), value: search.kpis.super_admins, icon: <ShieldCheck size={14} /> },
                ]}
            />

            <div className="premium-list-toolbar">
                <ListToolbar
                    search={search.search}
                    onSearchChange={search.setSearch}
                    searchPlaceholder={t('usersComponent.searchPlaceholder')}
                    filters={[{ key: 'status', placeholder: t('usersComponent.statusFilterPlaceholder'), options: STATUS_FILTER_OPTIONS, icon: <ShieldAlert size={14} /> }]}
                    filterValues={search.filters}
                    onFilterChange={search.setFilter}
                    sortOptions={[
                        { value: 'name', label: t('usersComponent.sortOptions.name') },
                        { value: 'email', label: t('usersComponent.sortOptions.email') },
                        { value: 'created_at', label: t('usersComponent.sortOptions.createdAt') },
                    ]}
                    sort={search.sort}
                    direction={search.direction}
                    onSortChange={search.setSort}
                    onDirectionToggle={() => search.setDirection(search.direction === 'asc' ? 'desc' : 'asc')}
                    onReset={search.resetFilters}
                    hasActiveFilters={search.hasActiveFilters}
                />
            </div>

            <Card className="premium-table-card">
                <Table
                    rowKey="id"
                    dataSource={search.items}
                    pagination={false}
                    columns={columns}
                    className="premium-table"
                    loading={search.loading}
                    scroll={{ x: tableWidth }}
                />
            </Card>

            <div ref={search.sentinelRef} style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
                {search.loading && <Spin size="small" />}
                {!search.hasMore && !search.loading && search.items.length > 0 && (
                    <span className="section-hint">{t('usersComponent.allShown')}</span>
                )}
                {!search.loading && search.items.length === 0 && (
                    <span className="section-hint">{t('usersComponent.noResults')}</span>
                )}
            </div>
        </div>
    );
});
