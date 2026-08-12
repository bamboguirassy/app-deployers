import KpiCollapse from '@/Components/KpiCollapse';
import ListToolbar from '@/Components/ListToolbar';
import { SourceIcon, StatusDotsIcon } from '@/Components/Deployments/DeploymentIcons';
import StatusTag from '@/Components/StatusTag';
import { formatDuration, SOURCE_LABELS, SOURCE_OPTIONS, STATUS_OPTIONS } from '@/constants/deployments';
import { useListSearch } from '@/hooks/useListSearch';
import { Deployment } from '@/types/models';
import { router } from '@inertiajs/react';
import { Avatar, Button, Card, Empty, Spin, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ArrowRight, Boxes, Clock, Filter, XCircle } from 'lucide-react';
import { KeyboardEvent } from 'react';

export interface AdminDeploymentMonitorKpis {
    total: number;
    running: number;
    echec: number;
    echec_24h: number;
}

interface AdminDeploymentRow extends Deployment {
    target_environment: Deployment['target_environment'] & {
        target: Deployment['target_environment']['target'] & {
            application?: {
                id: number;
                name: string;
                slug: string;
                logo_url?: string | null;
                workspace?: { id: number; name: string; slug: string } | null;
            } | null;
        };
    };
}

/**
 * Monitoring cross-workspace pour le super-admin : en-tête de tableau fixe
 * (antd `sticky` + `scroll.y`) et infinite scroll via useListSearch, à la
 * même convention que WorkspacesList.tsx / Admin/Users/List.tsx. Chaque ligne
 * ouvre la vue lecture-seule /admin/deployments/{deployment} (jamais la page
 * workspace-scopée, pour ne pas dépendre de l'appartenance du super-admin au
 * workspace concerné).
 */
export default function DeploymentsMonitor({
    searchUrl,
    initialItems,
    initialKpis,
}: {
    searchUrl: string;
    initialItems: AdminDeploymentRow[];
    initialKpis: AdminDeploymentMonitorKpis;
}) {
    const search = useListSearch<AdminDeploymentRow, AdminDeploymentMonitorKpis>(searchUrl, initialItems, initialKpis, {
        sort: 'created_at',
        direction: 'desc',
    });

    const getRowHref = (deployment: AdminDeploymentRow) => route('admin.deployments.show', deployment.uuid);

    const columns: ColumnsType<AdminDeploymentRow> = [
        {
            title: 'Workspace / Application',
            key: 'workspace',
            fixed: 'left',
            width: 240,
            render: (_value, d) => {
                const application = d.target_environment.target.application;

                return (
                    <span className="applications-table__name" title={`${application?.workspace?.name ?? '—'} / ${application?.name ?? '—'}`}>
                        <Avatar
                            size={28}
                            src={application?.logo_url ?? undefined}
                            icon={!application?.logo_url && <Boxes size={12} />}
                            shape="square"
                        />
                        <span className="applications-table__name-text">
                            <strong>{application?.workspace?.name ?? '—'}</strong>
                            <br />
                            <small style={{ color: 'var(--color-text-muted)' }}>{application?.name ?? '—'}</small>
                        </span>
                    </span>
                );
            },
        },
        {
            title: 'Target → Environnement',
            key: 'target',
            width: 220,
            render: (_value, d) => (
                <span>
                    {d.target_environment.target.name} <ArrowRight size={12} style={{ verticalAlign: 'middle', opacity: 0.5 }} />{' '}
                    {d.target_environment.environment.name}
                </span>
            ),
        },
        {
            title: 'Branche',
            dataIndex: 'branch',
            key: 'branch',
            width: 150,
            render: (branch) => <span className="branch-chip" title={branch}>{branch}</span>,
        },
        {
            title: 'Source',
            dataIndex: 'trigger_source',
            key: 'trigger_source',
            width: 140,
            render: (source) => (
                <span className="source-chip">
                    <SourceIcon source={source} />
                    {SOURCE_LABELS[source] ?? source}
                </span>
            ),
        },
        {
            title: 'Statut',
            dataIndex: 'status',
            key: 'status',
            width: 130,
            render: (status) => <StatusTag status={status} />,
        },
        {
            title: 'Durée',
            key: 'duration',
            width: 100,
            render: (_value, d) => formatDuration(d.duration_ms),
        },
        {
            title: 'Déclenché le',
            key: 'created_at',
            width: 170,
            render: (_value, d) => new Date(d.created_at).toLocaleString('fr-FR'),
        },
        {
            title: 'Ouvrir',
            key: 'action',
            align: 'right',
            fixed: 'right',
            width: 110,
            render: (_value, d) => (
                <a
                    href={getRowHref(d)}
                    className="premium-table__action"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        router.visit(getRowHref(d));
                    }}
                >
                    Ouvrir <ArrowRight size={14} />
                </a>
            ),
        },
    ];

    return (
        <div>
            <KpiCollapse
                title="Indicateurs clés"
                subtitle="Toutes plateformes confondues"
                items={[
                    { key: 'total', title: 'Total', value: search.kpis.total, icon: <Boxes size={14} /> },
                    { key: 'running', title: 'En cours', value: search.kpis.running, icon: <Clock size={14} /> },
                    { key: 'echec', title: 'Échecs (total)', value: search.kpis.echec, icon: <XCircle size={14} /> },
                    { key: 'echec_24h', title: 'Échecs (24h)', value: search.kpis.echec_24h, icon: <XCircle size={14} /> },
                ]}
            />

            <div className="premium-list-toolbar" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <ListToolbar
                    search={search.search}
                    onSearchChange={search.setSearch}
                    searchPlaceholder="Rechercher par branche ou commit..."
                    filters={[
                        { key: 'status', placeholder: 'Statut', options: STATUS_OPTIONS, icon: <StatusDotsIcon /> },
                        { key: 'trigger_source', placeholder: 'Source', options: SOURCE_OPTIONS, icon: <Filter size={14} /> },
                    ]}
                    filterValues={search.filters}
                    onFilterChange={search.setFilter}
                    sortOptions={[
                        { value: 'created_at', label: 'Date' },
                        { value: 'duration_ms', label: 'Durée' },
                        { value: 'status', label: 'Statut' },
                    ]}
                    sort={search.sort}
                    direction={search.direction}
                    onSortChange={search.setSort}
                    onDirectionToggle={() => search.setDirection(search.direction === 'asc' ? 'desc' : 'asc')}
                    onReset={search.resetFilters}
                    hasActiveFilters={search.hasActiveFilters}
                />
                <Button
                    danger
                    type={search.filters.status === 'echec' ? 'primary' : 'default'}
                    icon={<XCircle size={14} />}
                    onClick={() => search.setFilter('status', search.filters.status === 'echec' ? null : 'echec')}
                >
                    Voir les échecs
                </Button>
            </div>

            {search.items.length === 0 && !search.loading ? (
                <Card>
                    <Empty description="Aucun déploiement ne correspond à ces critères" />
                </Card>
            ) : (
                <>
                    <Card className="premium-table-card">
                        <Table
                            rowKey="id"
                            dataSource={search.items}
                            pagination={false}
                            sticky
                            scroll={{ y: 560, x: true }}
                            onRow={(record) => ({
                                onClick: () => router.visit(getRowHref(record)),
                                onKeyDown: (e: KeyboardEvent) => {
                                    if (e.key === 'Enter') {
                                        router.visit(getRowHref(record));
                                    }
                                },
                                tabIndex: 0,
                                style: { cursor: 'pointer' },
                            })}
                            columns={columns}
                            className="premium-table"
                        />
                    </Card>
                    <div ref={search.sentinelRef} style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: 16 }}>
                        {search.loading && (
                            <>
                                <Spin size="small" />
                                <span className="section-hint">Chargement de plus de déploiements...</span>
                            </>
                        )}
                        {!search.hasMore && !search.loading && search.items.length > 0 && (
                            <span className="section-hint">Tous les déploiements sont affichés.</span>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
