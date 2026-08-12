import KpiCollapse from '@/Components/KpiCollapse';
import ListToolbar from '@/Components/ListToolbar';
import { useListSearch } from '@/hooks/useListSearch';
import { AdminWorkspace } from '@/types';
import { router } from '@inertiajs/react';
import { Card, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Boxes, Building2, CheckCircle2, ShieldAlert } from 'lucide-react';
import { forwardRef, useImperativeHandle } from 'react';

export interface WorkspaceKpis {
    total: number;
    suspended: number;
    active_subscriptions: number;
}

export interface WorkspacesListHandle {
    refresh: () => void;
}

const STATUS_FILTER_OPTIONS = [
    { value: 'active', label: 'Actif' },
    { value: 'suspended', label: 'Suspendu' },
];

export default forwardRef<WorkspacesListHandle, {
    searchUrl: string;
    initialItems: AdminWorkspace[];
    initialKpis: WorkspaceKpis;
    getRowHref: (workspace: AdminWorkspace) => string;
}>(function WorkspacesList({ searchUrl, initialItems, initialKpis, getRowHref }, ref) {
    const search = useListSearch<AdminWorkspace, WorkspaceKpis>(searchUrl, initialItems, initialKpis, {
        sort: 'created_at',
        direction: 'desc',
    });

    useImperativeHandle(ref, () => ({ refresh: search.refresh }), [search.refresh]);

    const columns: ColumnsType<AdminWorkspace> = [
        {
            title: 'Workspace',
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
            title: 'Owner',
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
            title: 'Plan',
            key: 'plan',
            align: 'center',
            width: 110,
            render: (_value, workspace) =>
                workspace.subscription?.plan ? <Tag color="purple">{workspace.subscription.plan.name}</Tag> : <Tag>Free</Tag>,
        },
        {
            title: 'Statut abonnement',
            key: 'subscription_status',
            align: 'center',
            width: 160,
            render: (_value, workspace) =>
                workspace.subscription ? (
                    <span className={`premium-table__status premium-table__status--${workspace.subscription.status === 'active' ? 'success' : 'danger'}`}>
                        {workspace.subscription.status}
                    </span>
                ) : (
                    <span className="premium-table__status premium-table__status--muted">Aucun</span>
                ),
        },
        {
            title: 'Prochain renouvellement',
            key: 'renewal',
            align: 'center',
            width: 170,
            render: (_value, workspace) => {
                const subscription = workspace.subscription;
                const date =
                    subscription?.renews_at ??
                    (subscription?.status === 'past_due' && subscription?.grace_period_ends_at ? subscription.grace_period_ends_at : null);

                return date ? new Date(date).toLocaleDateString('fr-FR') : '—';
            },
        },
        {
            title: 'Applications',
            dataIndex: 'applications_count',
            key: 'applications_count',
            align: 'center',
            width: 110,
            render: (value: AdminWorkspace['applications_count']) => value ?? 0,
        },
        {
            title: 'Membres',
            dataIndex: 'members_count',
            key: 'members_count',
            align: 'center',
            width: 100,
            render: (value: AdminWorkspace['members_count']) => value ?? 0,
        },
        {
            title: 'Statut',
            key: 'status',
            align: 'center',
            width: 120,
            render: (_value, workspace) =>
                workspace.suspended_at ? (
                    <span className="premium-table__status premium-table__status--danger">
                        <ShieldAlert size={16} /> Suspendu
                    </span>
                ) : (
                    <span className="premium-table__status premium-table__status--success">
                        <CheckCircle2 size={16} /> Actif
                    </span>
                ),
        },
        {
            title: 'Créé le',
            key: 'created_at',
            width: 120,
            render: (_value, workspace) => (workspace.created_at ? new Date(workspace.created_at).toLocaleDateString('fr-FR') : '—'),
        },
    ];

    const tableWidth = 260 + 220 + 110 + 160 + 170 + 110 + 100 + 120 + 120;

    return (
        <div>
            <KpiCollapse
                title="Indicateurs clés"
                subtitle="Vue d'ensemble des workspaces de la plateforme"
                items={[
                    { key: 'total', title: 'Workspaces', value: search.kpis.total, icon: <Building2 size={14} /> },
                    { key: 'suspended', title: 'Suspendus', value: search.kpis.suspended, icon: <ShieldAlert size={14} /> },
                    { key: 'active_subscriptions', title: 'Abonnements actifs', value: search.kpis.active_subscriptions, icon: <Boxes size={14} /> },
                ]}
            />

            <div className="premium-list-toolbar">
                <ListToolbar
                    search={search.search}
                    onSearchChange={search.setSearch}
                    searchPlaceholder="Rechercher un workspace (nom, slug)..."
                    filters={[{ key: 'status', placeholder: 'Statut', options: STATUS_FILTER_OPTIONS, icon: <ShieldAlert size={14} /> }]}
                    filterValues={search.filters}
                    onFilterChange={search.setFilter}
                    sortOptions={[
                        { value: 'created_at', label: 'Date de création' },
                        { value: 'name', label: 'Nom' },
                        { value: 'applications_count', label: "Nb d'applications" },
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
                    <span className="section-hint">Tous les workspaces sont affichés.</span>
                )}
                {!search.loading && search.items.length === 0 && (
                    <span className="section-hint">Aucun workspace ne correspond à ces critères.</span>
                )}
            </div>
        </div>
    );
});
