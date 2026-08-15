import KpiCollapse from '@/Components/KpiCollapse';
import ListToolbar from '@/Components/ListToolbar';
import { MembersKpis, ROLE_OPTIONS } from '@/constants/members';
import { useListSearch } from '@/hooks/useListSearch';
import { ApplicationMember } from '@/types';
import { Avatar, Space, Spin, Table } from 'antd';
import { Crown, Eye, Users as UsersIcon, Wrench } from 'lucide-react';
import { ReactNode, forwardRef, useImperativeHandle } from 'react';
import { useTranslation } from 'react-i18next';

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
    const { t } = useTranslation('applications');
    const search = useListSearch<ApplicationMember, MembersKpis>(searchUrl, initialItems, initialKpis, {
        sort: 'name',
        direction: 'asc',
    });

    useImperativeHandle(ref, () => ({ refresh: search.refresh }), [search.refresh]);

    return (
        <div className="workspace-members-list">
            <KpiCollapse
                items={[
                    { key: 'total', title: t('membersList.kpiTotal'), value: search.kpis.total, icon: <UsersIcon size={14} /> },
                    { key: 'owner', title: t('membersList.kpiOwners'), value: search.kpis.owner, icon: <Crown size={14} /> },
                    { key: 'manager', title: t('membersList.kpiManagers'), value: search.kpis.manager, icon: <Wrench size={14} /> },
                    { key: 'deployer', title: t('membersList.kpiDeployers'), value: search.kpis.deployer },
                    { key: 'viewer', title: t('membersList.kpiViewers'), value: search.kpis.viewer, icon: <Eye size={14} /> },
                ]}
            />

            <div className="premium-list-toolbar application-list-controls">
              <ListToolbar
                search={search.search}
                onSearchChange={search.setSearch}
                searchPlaceholder={t('membersList.searchPlaceholder')}
                filters={[
                    {
                        key: 'role',
                        placeholder: t('membersList.roleFilterPlaceholder'),
                        options: ROLE_OPTIONS.map((r) => ({ value: r.value, label: r.value })),
                        icon: <Crown size={14} />,
                    },
                ]}
                filterValues={search.filters}
                onFilterChange={search.setFilter}
                sortOptions={[
                    { value: 'name', label: t('membersList.sortName') },
                    { value: 'email', label: t('membersList.sortEmail') },
                    { value: 'role', label: t('membersList.sortRole') },
                ]}
                sort={search.sort}
                direction={search.direction}
                onSortChange={search.setSort}
                onDirectionToggle={() => search.setDirection(search.direction === 'asc' ? 'desc' : 'asc')}
                onReset={search.resetFilters}
                hasActiveFilters={search.hasActiveFilters}
              />
            </div>

            <Table
                rowKey="id"
                dataSource={search.items}
                pagination={false}
                scroll={{ x: 'max-content' }}
                className="premium-table application-members-table"
                columns={[
                    {
                        title: t('membersList.memberColumn'),
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
                        title: t('membersList.roleColumn'),
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
                    <span className="section-hint">{t('membersList.allShown')}</span>
                )}
                {!search.loading && search.items.length === 0 && (
                    <span className="section-hint">{t('membersList.emptyResults')}</span>
                )}
            </div>
        </div>
    );
});
