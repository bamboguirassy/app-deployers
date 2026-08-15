import KpiCollapse from '@/Components/KpiCollapse';
import ListToolbar from '@/Components/ListToolbar';
import { useListSearch } from '@/hooks/useListSearch';
import { AdminWorkspace } from '@/types';
import { router } from '@inertiajs/react';
import { Card, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Boxes, Building2, CheckCircle2, ShieldAlert } from 'lucide-react';
import { forwardRef, useImperativeHandle } from 'react';
import { useTranslation } from 'react-i18next';
import { dateLocale } from '@/lib/i18n';

export interface WorkspaceKpis {
    total: number;
    suspended: number;
    active_subscriptions: number;
}

export interface WorkspacesListHandle {
    refresh: () => void;
}

export default forwardRef<WorkspacesListHandle, {
    searchUrl: string;
    initialItems: AdminWorkspace[];
    initialKpis: WorkspaceKpis;
    getRowHref: (workspace: AdminWorkspace) => string;
}>(function WorkspacesList({ searchUrl, initialItems, initialKpis, getRowHref }, ref) {
    const { t, i18n } = useTranslation('admin');
    const search = useListSearch<AdminWorkspace, WorkspaceKpis>(searchUrl, initialItems, initialKpis, {
        sort: 'created_at',
        direction: 'desc',
    });

    useImperativeHandle(ref, () => ({ refresh: search.refresh }), [search.refresh]);

    const STATUS_FILTER_OPTIONS = [
        { value: 'active', label: t('usersComponent.statusFilters.active') },
        { value: 'suspended', label: t('usersComponent.statusFilters.suspended') },
    ];

    const columns: ColumnsType<AdminWorkspace> = [
        {
            title: t('workspacesComponent.columns.workspace'),
            key: 'name',
            fixed: 'left',
            width: 260,
            render: (_value, workspace) => (
                <button type="button" className="premium-table__name" onClick={() => router.visit(getRowHref(workspace))}>
                    <span className="premium-table__name-icon">
                        {workspace.latest_application?.logo_url ? (
                            <img
                                src={workspace.latest_application.logo_url}
                                alt=""
                                style={{ width: 16, height: 16, objectFit: 'cover', borderRadius: 4 }}
                            />
                        ) : (
                            <Building2 size={16} />
                        )}
                    </span>
                    <span>
                        <strong>{workspace.name}</strong>
                        <small>{workspace.slug}</small>
                    </span>
                </button>
            ),
        },
        {
            title: t('workspacesComponent.columns.owner'),
            key: 'owner',
            width: 220,
            render: (_value, workspace) =>
                workspace.owner_name ? (
                    <span title={`${workspace.owner_name} (${workspace.owner_email})`}>
                        <strong>{workspace.owner_name}</strong>
                        <br />
                        <small style={{ color: 'var(--color-text-muted)' }}>
                            {workspace.owner_email}
                            {(workspace.owner_count ?? 0) > 1 && (
                                <Tag color="gold" style={{ marginLeft: 6 }}>
                                    +{(workspace.owner_count ?? 1) - 1}
                                </Tag>
                            )}
                        </small>
                    </span>
                ) : (
                    <span className="section-hint">—</span>
                ),
        },
        {
            title: t('workspacesComponent.columns.plan'),
            key: 'plan',
            align: 'center',
            width: 110,
            render: (_value, workspace) =>
                workspace.subscription?.plan ? <Tag color="purple">{workspace.subscription.plan.name}</Tag> : <Tag>{t('workspacesComponent.columns.free')}</Tag>,
        },
        {
            title: t('workspacesComponent.columns.subscriptionStatus'),
            key: 'subscription_status',
            align: 'center',
            width: 160,
            render: (_value, workspace) =>
                workspace.subscription ? (
                    <span className={`premium-table__status premium-table__status--${workspace.subscription.status === 'active' ? 'success' : 'danger'}`}>
                        {workspace.subscription.status}
                    </span>
                ) : (
                    <span className="premium-table__status premium-table__status--muted">{t('workspacesComponent.columns.noSubscription')}</span>
                ),
        },
        {
            title: t('workspacesComponent.columns.renewal'),
            key: 'renewal',
            align: 'center',
            width: 170,
            render: (_value, workspace) => {
                const subscription = workspace.subscription;
                const date =
                    subscription?.renews_at ??
                    (subscription?.status === 'past_due' && subscription?.grace_period_ends_at ? subscription.grace_period_ends_at : null);

                return date ? new Date(date).toLocaleDateString(dateLocale(i18n.language)) : '—';
            },
        },
        {
            title: t('workspacesComponent.columns.applications'),
            dataIndex: 'applications_count',
            key: 'applications_count',
            align: 'center',
            width: 110,
            render: (value: AdminWorkspace['applications_count']) => value ?? 0,
        },
        {
            title: t('workspacesComponent.columns.members'),
            dataIndex: 'members_count',
            key: 'members_count',
            align: 'center',
            width: 100,
            render: (value: AdminWorkspace['members_count']) => value ?? 0,
        },
        {
            title: t('workspacesComponent.columns.status'),
            key: 'status',
            align: 'center',
            width: 120,
            render: (_value, workspace) =>
                workspace.suspended_at ? (
                    <span className="premium-table__status premium-table__status--danger">
                        <ShieldAlert size={16} /> {t('workspacesComponent.columns.suspended')}
                    </span>
                ) : (
                    <span className="premium-table__status premium-table__status--success">
                        <CheckCircle2 size={16} /> {t('workspacesComponent.columns.active')}
                    </span>
                ),
        },
        {
            title: t('workspacesComponent.columns.createdAt'),
            key: 'created_at',
            width: 120,
            render: (_value, workspace) => (workspace.created_at ? new Date(workspace.created_at).toLocaleDateString(dateLocale(i18n.language)) : '—'),
        },
    ];

    const tableWidth = 260 + 220 + 110 + 160 + 170 + 110 + 100 + 120 + 120;

    return (
        <div>
            <KpiCollapse
                title={t('workspacesComponent.kpiTitle')}
                subtitle={t('workspacesComponent.kpiSubtitle')}
                items={[
                    { key: 'total', title: t('workspacesComponent.kpis.total'), value: search.kpis.total, icon: <Building2 size={14} /> },
                    { key: 'suspended', title: t('workspacesComponent.kpis.suspended'), value: search.kpis.suspended, icon: <ShieldAlert size={14} /> },
                    { key: 'active_subscriptions', title: t('workspacesComponent.kpis.activeSubscriptions'), value: search.kpis.active_subscriptions, icon: <Boxes size={14} /> },
                ]}
            />

            <div className="premium-list-toolbar">
                <ListToolbar
                    search={search.search}
                    onSearchChange={search.setSearch}
                    searchPlaceholder={t('workspacesComponent.searchPlaceholder')}
                    filters={[{ key: 'status', placeholder: t('usersComponent.statusFilterPlaceholder'), options: STATUS_FILTER_OPTIONS, icon: <ShieldAlert size={14} /> }]}
                    filterValues={search.filters}
                    onFilterChange={search.setFilter}
                    sortOptions={[
                        { value: 'created_at', label: t('workspacesComponent.sortOptions.createdAt') },
                        { value: 'name', label: t('workspacesComponent.sortOptions.name') },
                        { value: 'applications_count', label: t('workspacesComponent.sortOptions.applicationsCount') },
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
                    <span className="section-hint">{t('workspacesComponent.allShown')}</span>
                )}
                {!search.loading && search.items.length === 0 && (
                    <span className="section-hint">{t('workspacesComponent.noResults')}</span>
                )}
            </div>
        </div>
    );
});
