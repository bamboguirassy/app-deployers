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

const ROLE_LABELS: Record<string, string> = {
    owner: 'Owner',
    manager: 'Manager',
    deployer: 'Deployer',
    viewer: 'Viewer',
};

const WORKSPACE_TAGS_VISIBLE = 2;

export interface AdminUserKpis {
    total: number;
    suspended: number;
    super_admins: number;
}

export interface AdminUsersListHandle {
    refresh: () => void;
}

const STATUS_FILTER_OPTIONS = [
    { value: 'active', label: 'Actif' },
    { value: 'suspended', label: 'Suspendu' },
    { value: 'super_admin', label: 'Super-admin' },
];

export default forwardRef<AdminUsersListHandle, {
    searchUrl: string;
    initialItems: User[];
    initialKpis: AdminUserKpis;
}>(function AdminUsersList({ searchUrl, initialItems, initialKpis }, ref) {
    const { auth } = usePage<PageProps>().props;
    const confirm = useConfirm();
    const search = useListSearch<User, AdminUserKpis>(searchUrl, initialItems, initialKpis, {
        sort: 'name',
        direction: 'asc',
    });

    useImperativeHandle(ref, () => ({ refresh: search.refresh }), [search.refresh]);

    const promote = (user: User) => {
        confirm.confirm({
            title: `Accorder les droits super-admin à ${user.name} ?`,
            content: 'Cet utilisateur pourra accéder au panneau plateforme et gérer tous les workspaces.',
            okText: 'Promouvoir',
            cancelText: 'Annuler',
            onOk: () => {
                router.post(route('admin.users.promote', user.uuid), {}, { onSuccess: () => search.refresh() });
            },
        });
    };

    const demote = (user: User) => {
        confirm.confirm({
            title: `Retirer les droits super-admin de ${user.name} ?`,
            okType: 'danger',
            okText: 'Rétrograder',
            cancelText: 'Annuler',
            onOk: () => {
                router.post(route('admin.users.demote', user.uuid), {}, { onSuccess: () => search.refresh() });
            },
        });
    };

    const columns: ColumnsType<User> = [
        {
            title: 'Utilisateur',
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
            title: 'Workspaces',
            key: 'workspaces',
            width: 280,
            render: (_value, user) => {
                const workspaces = user.workspaces ?? [];

                if (workspaces.length === 0) {
                    return <span className="section-hint">Aucun</span>;
                }

                const visible = workspaces.slice(0, WORKSPACE_TAGS_VISIBLE);
                const overflow = workspaces.slice(WORKSPACE_TAGS_VISIBLE);

                return (
                    <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4 }}>
                        {visible.map((workspace) => (
                            <Tooltip
                                key={workspace.id}
                                title={workspace.role ? `Rôle : ${ROLE_LABELS[workspace.role] ?? workspace.role}` : undefined}
                            >
                                <Tag color={workspace.role === 'owner' ? 'gold' : 'default'} style={{ marginInlineEnd: 0 }}>
                                    {workspace.name}
                                </Tag>
                            </Tooltip>
                        ))}
                        {overflow.length > 0 && (
                            <Popover
                                title="Autres workspaces"
                                content={
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 220 }}>
                                        {overflow.map((workspace) => (
                                            <span key={workspace.id}>
                                                <Tag color={workspace.role === 'owner' ? 'gold' : 'default'} style={{ marginInlineEnd: 6 }}>
                                                    {workspace.name}
                                                </Tag>
                                                <small style={{ color: 'var(--color-text-muted)' }}>
                                                    {workspace.role ? ROLE_LABELS[workspace.role] ?? workspace.role : ''}
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
            title: 'Statut',
            key: 'status',
            align: 'center',
            width: 120,
            render: (_value, user) =>
                user.suspended_at ? (
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
            title: 'Super-admin',
            key: 'super_admin',
            align: 'center',
            width: 130,
            render: (_value, user) =>
                user.is_super_admin ? (
                    <span className="premium-table__status premium-table__status--success">
                        <ShieldCheck size={16} /> Oui
                    </span>
                ) : (
                    <span className="premium-table__status premium-table__status--muted">Non</span>
                ),
        },
        {
            title: 'Inscription',
            key: 'created_at',
            width: 130,
            render: (_value, user) => (user.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR') : '—'),
        },
        {
            title: 'Action',
            key: 'action',
            align: 'right',
            fixed: 'right',
            width: 160,
            render: (_value, user) => {
                const isSelf = user.id === auth.user.id;

                return user.is_super_admin ? (
                    <Tooltip title={isSelf ? 'Vous ne pouvez pas vous rétrograder vous-même' : undefined}>
                        <Button
                            size="small"
                            danger
                            disabled={isSelf}
                            icon={<ShieldOff size={14} />}
                            onClick={() => demote(user)}
                        >
                            Rétrograder
                        </Button>
                    </Tooltip>
                ) : (
                    <Button size="small" icon={<ShieldCheck size={14} />} onClick={() => promote(user)}>
                        Promouvoir
                    </Button>
                );
            },
        },
    ];

    const tableWidth = 260 + 280 + 120 + 130 + 130 + 160;

    return (
        <div>
            <KpiCollapse
                title="Indicateurs clés"
                subtitle="Tous les utilisateurs de la plateforme, tous workspaces confondus"
                items={[
                    { key: 'total', title: 'Utilisateurs', value: search.kpis.total, icon: <UsersIcon size={14} /> },
                    { key: 'suspended', title: 'Suspendus', value: search.kpis.suspended, icon: <ShieldAlert size={14} /> },
                    { key: 'super_admins', title: 'Super-admins', value: search.kpis.super_admins, icon: <ShieldCheck size={14} /> },
                ]}
            />

            <div className="premium-list-toolbar">
                <ListToolbar
                    search={search.search}
                    onSearchChange={search.setSearch}
                    searchPlaceholder="Rechercher par nom ou email..."
                    filters={[{ key: 'status', placeholder: 'Statut', options: STATUS_FILTER_OPTIONS, icon: <ShieldAlert size={14} /> }]}
                    filterValues={search.filters}
                    onFilterChange={search.setFilter}
                    sortOptions={[
                        { value: 'name', label: 'Nom' },
                        { value: 'email', label: 'Email' },
                        { value: 'created_at', label: 'Date d\'inscription' },
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
                    <span className="section-hint">Tous les utilisateurs sont affichés.</span>
                )}
                {!search.loading && search.items.length === 0 && (
                    <span className="section-hint">Aucun utilisateur ne correspond à ces critères.</span>
                )}
            </div>
        </div>
    );
});
