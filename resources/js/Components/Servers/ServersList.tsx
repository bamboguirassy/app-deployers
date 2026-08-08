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
import { KeyRound, Lock, Pencil, PlugZap, Server as ServerIcon, Trash2 } from 'lucide-react';
import { forwardRef, useImperativeHandle, useState } from 'react';

export interface ServerKpis {
    total: number;
    password: number;
    ssh_key: number;
}

export interface ServersListHandle {
    refresh: () => void;
}

const AUTH_OPTIONS = [
    { value: 'ssh_key', label: 'Clé SSH' },
    { value: 'password', label: 'Mot de passe' },
];

export default forwardRef<ServersListHandle, {
    workspaceSlug: string;
    searchUrl: string;
    initialItems: Server[];
    initialKpis: ServerKpis;
}>(function ServersList({ workspaceSlug, searchUrl, initialItems, initialKpis }, ref) {
    const search = useListSearch<Server, ServerKpis>(searchUrl, initialItems, initialKpis, {
        sort: 'name',
        direction: 'asc',
    });
    const confirm = useConfirm();
    const [editing, setEditing] = useState<Server | undefined>(undefined);
    const [testing, setTesting] = useState<Server | null>(null);

    useImperativeHandle(ref, () => ({ refresh: search.refresh }), [search.refresh]);

    const removeServer = (server: Server) => {
        confirm.confirm({
            title: `Supprimer le serveur "${server.name}" ?`,
            content: "Les target×environnement qui l'utilisent perdront leur association.",
            okType: 'danger',
            okText: 'Supprimer',
            cancelText: 'Annuler',
            onOk: () =>
                router.delete(route('servers.destroy', [workspaceSlug, server.id]), {
                    onSuccess: () => search.refresh(),
                }),
        });
    };

    const columns: ColumnsType<Server> = [
        {
            title: 'Serveur',
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
                    </span>
                </span>
            ),
        },
        {
            title: 'Authentification',
            key: 'auth_method',
            align: 'center',
            width: 160,
            render: (_value, server) =>
                server.auth_method === 'ssh_key' ? (
                    <Tag color="blue" style={{ whiteSpace: 'nowrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                            <KeyRound size={12} />
                            Clé SSH
                        </span>
                    </Tag>
                ) : (
                    <Tag style={{ whiteSpace: 'nowrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                            <Lock size={12} />
                            Mot de passe
                        </span>
                    </Tag>
                ),
        },
        {
            title: 'Ajouté le',
            key: 'created_at',
            render: (_value, server) => new Date(server.created_at).toLocaleDateString('fr-FR'),
        },
        {
            title: '',
            key: 'actions',
            align: 'right',
            render: (_value, server) => (
                <span style={{ display: 'inline-flex', gap: 12 }}>
                    <a onClick={() => setTesting(server)} aria-label="Tester la connexion" title="Tester la connexion">
                        <PlugZap size={14} />
                    </a>
                    <a onClick={() => setEditing(server)} aria-label="Modifier" title="Modifier">
                        <Pencil size={14} />
                    </a>
                    <a onClick={() => removeServer(server)} aria-label="Supprimer" title="Supprimer">
                        <Trash2 size={14} />
                    </a>
                </span>
            ),
        },
    ];

    return (
        <div>
            <KpiCollapse
                title="Indicateurs clés"
                subtitle="Aperçu de votre parc de serveurs"
                items={[
                    { key: 'total', title: 'Serveurs', value: search.kpis.total, icon: <ServerIcon size={14} /> },
                    { key: 'ssh_key', title: 'Par clé SSH', value: search.kpis.ssh_key, icon: <KeyRound size={14} /> },
                    { key: 'password', title: 'Par mot de passe', value: search.kpis.password, icon: <Lock size={14} /> },
                ]}
            />

            <div className="premium-list-toolbar">
                <ListToolbar
                    search={search.search}
                    onSearchChange={search.setSearch}
                    searchPlaceholder="Rechercher par nom, hôte ou utilisateur..."
                    filters={[{ key: 'auth_method', placeholder: 'Authentification', options: AUTH_OPTIONS, icon: <KeyRound size={14} /> }]}
                    filterValues={search.filters}
                    onFilterChange={search.setFilter}
                    sortOptions={[
                        { value: 'name', label: 'Nom' },
                        { value: 'host', label: 'Hôte' },
                        { value: 'created_at', label: "Date d'ajout" },
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
                    <Empty description="Aucun serveur ne correspond à ces critères" />
                </Card>
            ) : (
                <>
                    <Card className="premium-table-card">
                        <Table rowKey="id" dataSource={search.items} pagination={false} columns={columns} className="premium-table" />
                    </Card>
                    <div ref={search.sentinelRef} style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
                        {search.loading && <Spin size="small" />}
                        {!search.hasMore && !search.loading && search.items.length > 0 && (
                            <span className="section-hint">Tous les serveurs sont affichés.</span>
                        )}
                    </div>
                </>
            )}

            <ServerFormModal workspaceSlug={workspaceSlug} server={editing} open={!!editing} onClose={() => setEditing(undefined)} />
            <TestConnectionModal workspaceSlug={workspaceSlug} server={testing} onClose={() => setTesting(null)} />
        </div>
    );
});
