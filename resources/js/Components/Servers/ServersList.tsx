import KpiCollapse from '@/Components/KpiCollapse';
import ListToolbar from '@/Components/ListToolbar';
import ServerFormModal from '@/Components/Servers/ServerFormModal';
import TestConnectionModal from '@/Components/Servers/TestConnectionModal';
import { useConfirm } from '@/theme/ConfirmContext';
import { useListSearch } from '@/hooks/useListSearch';
import { dateLocale } from '@/lib/i18n';
import { Server } from '@/types/models';
import { router } from '@inertiajs/react';
import { Empty, Spin, Tooltip } from 'antd';
import { FolderOpen, KeyRound, Lock, Pencil, PlugZap, Server as ServerIcon, Trash2 } from 'lucide-react';
import { forwardRef, useImperativeHandle, useState } from 'react';
import { useTranslation } from 'react-i18next';

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
                <div className="app-grid-empty">
                    <Empty description={t('list.emptyDescription')} />
                </div>
            ) : (
                <>
                    <div className="srv-grid">
                        {search.items.map((server) => (
                            <div key={server.id} className={`srv-card srv-card--${server.auth_method}`}>

                                {/* Header */}
                                <div className="srv-card__header">
                                    <span className={`srv-card__icon srv-card__icon--${server.auth_method}`}>
                                        <ServerIcon size={18} />
                                    </span>
                                    <div className="srv-card__identity">
                                        <strong className="srv-card__name">{server.name}</strong>
                                        <span className="srv-card__host">
                                            {server.username}@{server.host}:{server.port}
                                        </span>
                                    </div>
                                </div>

                                {/* Path */}
                                {server.default_path && server.default_path !== '/' && (
                                    <div className="srv-card__path">
                                        <FolderOpen size={11} />
                                        <span>{server.default_path}</span>
                                    </div>
                                )}

                                {/* Footer */}
                                <div className="srv-card__footer">
                                    <span className={`srv-card__auth srv-card__auth--${server.auth_method}`}>
                                        {server.auth_method === 'ssh_key' ? <KeyRound size={11} /> : <Lock size={11} />}
                                        {server.auth_method === 'ssh_key' ? t('list.authOptions.sshKey') : t('list.authOptions.password')}
                                    </span>
                                    <span className="srv-card__date">
                                        {new Date(server.created_at).toLocaleDateString(dateLocale(i18n.language))}
                                    </span>
                                    <div className="srv-card__actions">
                                        <Tooltip title={t('list.actions.testConnection')}>
                                            <button
                                                type="button"
                                                className="srv-card__action"
                                                aria-label={t('list.actions.testConnection')}
                                                onClick={() => setTesting(server)}
                                            >
                                                <PlugZap size={14} />
                                            </button>
                                        </Tooltip>
                                        <Tooltip title={t('list.actions.edit')}>
                                            <button
                                                type="button"
                                                className="srv-card__action"
                                                aria-label={t('list.actions.edit')}
                                                onClick={() => setEditing(server)}
                                            >
                                                <Pencil size={14} />
                                            </button>
                                        </Tooltip>
                                        <Tooltip title={t('list.actions.delete')}>
                                            <button
                                                type="button"
                                                className="srv-card__action srv-card__action--danger"
                                                aria-label={t('list.actions.delete')}
                                                onClick={() => removeServer(server)}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </Tooltip>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

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
