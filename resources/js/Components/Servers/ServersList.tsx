import KpiCollapse from '@/Components/KpiCollapse';
import ListToolbar from '@/Components/ListToolbar';
import ServerFormModal from '@/Components/Servers/ServerFormModal';
import TestConnectionModal from '@/Components/Servers/TestConnectionModal';
import { useConfirm } from '@/theme/ConfirmContext';
import { useListSearch } from '@/hooks/useListSearch';
import { Server } from '@/types/models';
import { router } from '@inertiajs/react';
import { Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { FolderOpen, KeyRound, Lock, Pencil, PlugZap, Server as ServerIcon, Trash2 } from 'lucide-react';
import { forwardRef, useImperativeHandle, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { dateLocale } from '@/lib/i18n';

export interface ServerKpis {
    total: number;
    password: number;
    ssh_key: number;
}

export interface ServersListHandle {
    refresh: () => void;
}

export default forwardRef<ServersListHandle, {
    workspaceSlug: string;
    searchUrl: string;
    initialItems: Server[];
    initialKpis: ServerKpis;
}>(function ServersList({ workspaceSlug, searchUrl, initialItems, initialKpis }, ref) {
    const { t, i18n } = useTranslation('servers');
    const search = useListSearch<Server, ServerKpis>(searchUrl, initialItems, initialKpis, {
        sort: 'name',
        direction: 'asc',
    });
    const confirm = useConfirm();
    const [editing, setEditing] = useState<Server | undefined>(undefined);
    const [testing, setTesting] = useState<Server | null>(null);

    useImperativeHandle(ref, () => ({ refresh: search.refresh }), [search.refresh]);

    const AUTH_OPTIONS = [
        { value: 'ssh_key', label: t('list.authOptions.sshKey') },
        { value: 'password', label: t('list.authOptions.password') },
    ];

    const removeServer = (server: Server) => {
        confirm.confirm({
            title: t('list.delete.confirmTitle', { name: server.name }),
            content: t('list.delete.confirmContent'),
            okType: 'danger',
            okText: t('list.delete.okText'),
            cancelText: t('list.delete.cancelText'),
            onOk: () =>
                router.delete(route('servers.destroy', [workspaceSlug, server.uuid]), {
                    onSuccess: () => search.refresh(),
                }),
        });
    };

    const columns: ColumnsType<Server> = [
        {
            title: t('list.columns.server'),
            key: 'name',
            render: (_value, server) => (
                <span className="premium-table__name">
                    <span className="applications-table__metric-icon">
                        <ServerIcon size={16} />
                    </span>
                    <span>
                        <strong>{server.name}</strong>
                        <small>
                            {server.username}@{server.host}:{server.port}
                        </small>
                        {server.default_path && server.default_path !== '/' && (
                            <small style={{ color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                                <FolderOpen size={11} />
                                {server.default_path}
                            </small>
                        )}
                    </span>
                </span>
            ),
        },
        {
            title: t('list.columns.authentication'),
            key: 'auth_method',
            align: 'center',
            width: 160,
            render: (_value, server) =>
                server.auth_method === 'ssh_key' ? (
                    <Tag color="blue" style={{ whiteSpace: 'nowrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                            <KeyRound size={12} />
                            {t('list.authOptions.sshKey')}
                        </span>
                    </Tag>
                ) : (
                    <Tag style={{ whiteSpace: 'nowrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                            <Lock size={12} />
                            {t('list.authOptions.password')}
                        </span>
                    </Tag>
                ),
        },
        {
            title: t('list.columns.addedOn'),
            key: 'created_at',
            render: (_value, server) => new Date(server.created_at).toLocaleDateString(dateLocale(i18n.language)),
        },
        {
            title: '',
            key: 'actions',
            align: 'right',
            render: (_value, server) => (
                <span style={{ display: 'inline-flex', gap: 12 }}>
                    <a onClick={() => setTesting(server)} aria-label={t('list.actions.testConnection')} title={t('list.actions.testConnection')}>
                        <PlugZap size={14} />
                    </a>
                    <a onClick={() => setEditing(server)} aria-label={t('list.actions.edit')} title={t('list.actions.edit')}>
                        <Pencil size={14} />
                    </a>
                    <a onClick={() => removeServer(server)} aria-label={t('list.actions.delete')} title={t('list.actions.delete')}>
                        <Trash2 size={14} />
                    </a>
                </span>
            ),
        },
    ];

    return (
        <div>
            <KpiCollapse
                title={t('list.kpisTitle')}
                subtitle={t('list.kpisSubtitle')}
                items={[
                    { key: 'total', title: t('list.kpis.total'), value: search.kpis.total, icon: <ServerIcon size={14} /> },
                    { key: 'ssh_key', title: t('list.kpis.sshKey'), value: search.kpis.ssh_key, icon: <KeyRound size={14} /> },
                    { key: 'password', title: t('list.kpis.password'), value: search.kpis.password, icon: <Lock size={14} /> },
                ]}
            />

            <div className="premium-list-toolbar">
                <ListToolbar
                    search={search.search}
                    onSearchChange={search.setSearch}
                    searchPlaceholder={t('list.toolbar.searchPlaceholder')}
                    filters={[{ key: 'auth_method', placeholder: t('list.toolbar.authPlaceholder'), options: AUTH_OPTIONS, icon: <KeyRound size={14} /> }]}
                    filterValues={search.filters}
                    onFilterChange={search.setFilter}
                    sortOptions={[
                        { value: 'name', label: t('list.toolbar.sortName') },
                        { value: 'host', label: t('list.toolbar.sortHost') },
                        { value: 'created_at', label: t('list.toolbar.sortCreatedAt') },
                    ]}
                    sort={search.sort}
                    direction={search.direction}
                    onSortChange={search.setSort}
                    onDirectionToggle={() => search.setDirection(search.direction === 'asc' ? 'desc' : 'asc')}
                    onReset={search.resetFilters}
                    hasActiveFilters={search.hasActiveFilters}
                />
            </div>

            {search.items.length === 0 && !search.loading ? (
                <Card>
                    <Empty description={t('list.emptyDescription')} />
                </Card>
            ) : (
                <>
                    <Card className="premium-table-card">
                        <Table rowKey="id" dataSource={search.items} pagination={false} columns={columns} className="premium-table" scroll={{ x: 'max-content' }} />
                    </Card>
                    <div ref={search.sentinelRef} style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
                        {search.loading && <Spin size="small" />}
                        {!search.hasMore && !search.loading && search.items.length > 0 && (
                            <span className="section-hint">{t('list.allShown')}</span>
                        )}
                    </div>
                </>
            )}

            <ServerFormModal workspaceSlug={workspaceSlug} server={editing} open={!!editing} onClose={() => setEditing(undefined)} />
            <TestConnectionModal workspaceSlug={workspaceSlug} server={testing} onClose={() => setTesting(null)} />
        </div>
    );
});
