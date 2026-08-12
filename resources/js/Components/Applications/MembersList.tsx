import KpiCollapse from '@/Components/KpiCollapse';
import ListToolbar from '@/Components/ListToolbar';
import { MembersKpis, ROLE_OPTIONS } from '@/constants/members';
import { useListSearch } from '@/hooks/useListSearch';
import { ApplicationMember } from '@/types';
import { Avatar, Space, Spin, Table } from 'antd';
import { Crown, Eye, Users as UsersIcon, Wrench } from 'lucide-react';
import { ReactNode, forwardRef, useImperativeHandle } from 'react';

export interface MembersListHandle {
    refresh: () => void;
}

export default forwardRef<MembersListHandle, {
    searchUrl: string;
    initialItems: ApplicationMember[];
    initialKpis: MembersKpis;
    renderRole?: (member: ApplicationMember) => ReactNode;
    renderActions?: (member: ApplicationMember) => ReactNode;
}>(function MembersList({ searchUrl, initialItems, initialKpis, renderRole, renderActions }, ref) {
    const search = useListSearch<ApplicationMember, MembersKpis>(searchUrl, initialItems, initialKpis, {
        sort: 'name',
        direction: 'asc',
    });

    useImperativeHandle(ref, () => ({ refresh: search.refresh }), [search.refresh]);

    return (
        <div>
            <KpiCollapse
                items={[
                    { key: 'total', title: 'Total', value: search.kpis.total, icon: <UsersIcon size={14} /> },
                    { key: 'owner', title: 'Owners', value: search.kpis.owner, icon: <Crown size={14} /> },
                    { key: 'manager', title: 'Managers', value: search.kpis.manager, icon: <Wrench size={14} /> },
                    { key: 'deployer', title: 'Deployers', value: search.kpis.deployer },
                    { key: 'viewer', title: 'Viewers', value: search.kpis.viewer, icon: <Eye size={14} /> },
                ]}
            />

            <ListToolbar
                search={search.search}
                onSearchChange={search.setSearch}
                searchPlaceholder="Rechercher par nom ou email..."
                filters={[
                    {
                        key: 'role',
                        placeholder: 'Rôle',
                        options: ROLE_OPTIONS.map((r) => ({ value: r.value, label: r.value })),
                        icon: <Crown size={14} />,
                    },
                ]}
                filterValues={search.filters}
                onFilterChange={search.setFilter}
                sortOptions={[
                    { value: 'name', label: 'Nom' },
                    { value: 'email', label: 'Email' },
                    { value: 'role', label: 'Rôle' },
                ]}
                sort={search.sort}
                direction={search.direction}
                onSortChange={search.setSort}
                onDirectionToggle={() => search.setDirection(search.direction === 'asc' ? 'desc' : 'asc')}
                onReset={search.resetFilters}
                hasActiveFilters={search.hasActiveFilters}
            />

            <Table
                rowKey="id"
                dataSource={search.items}
                pagination={false}
                scroll={{ x: 'max-content' }}
                columns={[
                    {
                        title: 'Membre',
                        render: (_, member) => (
                            <Space>
                                <Avatar size="small">{member.name.charAt(0).toUpperCase()}</Avatar>
                                <div>
                                    <div>{member.name}</div>
                                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{member.email}</span>
                                </div>
                            </Space>
                        ),
                    },
                    {
                        title: 'Rôle',
                        render: (_, member) => (renderRole ? renderRole(member) : member.role),
                    },
                    ...(renderActions
                        ? [
                              {
                                  title: '',
                                  render: (_: unknown, member: ApplicationMember) => renderActions(member),
                              },
                          ]
                        : []),
                ]}
            />

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
