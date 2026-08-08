import KpiCollapse from '@/Components/KpiCollapse';
import ListToolbar from '@/Components/ListToolbar';
import { ROLE_COLORS, ROLE_OPTIONS } from '@/constants/members';
import { useListSearch } from '@/hooks/useListSearch';
import { User } from '@/types';
import { router } from '@inertiajs/react';
import { Avatar, Card, Space, Spin, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckCircle2, ShieldAlert, ShieldCheck, Users as UsersIcon, XCircle } from 'lucide-react';
import { forwardRef, useImperativeHandle } from 'react';

const { Text } = Typography;

export interface UserKpis {
    total: number;
    owner: number;
    manager: number;
    deployer: number;
    viewer: number;
}

export interface UsersListHandle {
    refresh: () => void;
}

export default forwardRef<UsersListHandle, {
    searchUrl: string;
    initialItems: User[];
    initialKpis: UserKpis;
    getRowHref: (user: User) => string;
}>(function UsersList({ searchUrl, initialItems, initialKpis, getRowHref }, ref) {
    const search = useListSearch<User, UserKpis>(searchUrl, initialItems, initialKpis, {
        sort: 'name',
        direction: 'asc',
    });

    useImperativeHandle(ref, () => ({ refresh: search.refresh }), [search.refresh]);

    const columns: ColumnsType<User> = [
        {
            title: 'Utilisateur',
            key: 'user',
            render: (_value, user) => (
                <button type="button" className="premium-table__name" onClick={() => router.visit(getRowHref(user))}>
                    <Avatar size={40}>{user.name.charAt(0).toUpperCase()}</Avatar>
                    <span>
                        <strong>{user.name}</strong>
                        <small>{user.email}</small>
                    </span>
                </button>
            ),
        },
        {
            title: 'Email vérifié',
            key: 'verified',
            align: 'center',
            render: (_value, user) =>
                user.email_verified_at ? (
                    <span className="premium-table__status premium-table__status--success">
                        <CheckCircle2 size={16} /> Vérifié
                    </span>
                ) : (
                    <span className="premium-table__status premium-table__status--muted">
                        <XCircle size={16} /> En attente
                    </span>
                ),
        },
        {
            title: 'Rôle',
            key: 'role',
            render: (_value, user) => (user.role ? <Tag color={ROLE_COLORS[user.role]}>{user.role}</Tag> : '—'),
        },
        {
            title: 'Applications',
            key: 'applications',
            render: (_value, user) => (
                <Space size={4} wrap>
                    {(user.applications ?? []).map((a) => (
                        <Tag key={a.application_slug} className="premium-table__tag">
                            {a.application_name}
                        </Tag>
                    ))}
                    {(user.applications ?? []).length === 0 && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Aucune
                        </Text>
                    )}
                </Space>
            ),
        },
        {
            title: 'Statut',
            key: 'status',
            align: 'center',
            render: (_value, user) =>
                user.suspended_at ? (
                    <span className="premium-table__status premium-table__status--danger">
                        <ShieldAlert size={16} /> Suspendu
                    </span>
                ) : (
                    <span className="premium-table__status premium-table__status--success">
                        <ShieldCheck size={16} /> Actif
                    </span>
                ),
        },
        {
            title: 'Inscription',
            key: 'created_at',
            render: (_value, user) => (user.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR') : '—'),
        },
    ];

    return (
        <div>
            <KpiCollapse
                items={[
                    { key: 'total', title: 'Total', value: search.kpis.total, icon: <UsersIcon size={14} /> },
                    { key: 'owner', title: 'Owners', value: search.kpis.owner, icon: <ShieldCheck size={14} /> },
                    { key: 'manager', title: 'Managers', value: search.kpis.manager, icon: <ShieldCheck size={14} /> },
                    { key: 'deployer', title: 'Deployers', value: search.kpis.deployer, icon: <ShieldCheck size={14} /> },
                    { key: 'viewer', title: 'Viewers', value: search.kpis.viewer, icon: <ShieldAlert size={14} /> },
                ]}
            />

            <div className="premium-list-toolbar">
                <ListToolbar
                    search={search.search}
                    onSearchChange={search.setSearch}
                    searchPlaceholder="Rechercher par nom ou email..."
                    filters={[{ key: 'status', placeholder: 'Rôle', options: ROLE_OPTIONS, icon: <ShieldCheck size={14} /> }]}
                    filterValues={search.filters}
                    onFilterChange={search.setFilter}
                    sortOptions={[
                        { value: 'name', label: 'Nom' },
                        { value: 'email', label: 'Email' },
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
                <Table rowKey="id" dataSource={search.items} pagination={false} columns={columns} className="premium-table" />
            </Card>

            <div ref={search.sentinelRef} style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
                {search.loading && <Spin size="small" />}
                {!search.hasMore && !search.loading && search.items.length > 0 && (
                    <span className="section-hint">Tous les membres sont affichés.</span>
                )}
                {!search.loading && search.items.length === 0 && (
                    <span className="section-hint">Aucun membre ne correspond à ces critères.</span>
                )}
            </div>
        </div>
    );
});
