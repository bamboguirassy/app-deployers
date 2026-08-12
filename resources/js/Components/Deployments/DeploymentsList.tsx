import KpiCollapse from '@/Components/KpiCollapse';
import ListToolbar from '@/Components/ListToolbar';
import { SourceIcon, StatusDotsIcon } from '@/Components/Deployments/DeploymentIcons';
import StatusTag from '@/Components/StatusTag';
import { DeploymentKpis, formatDuration, SOURCE_LABELS, SOURCE_OPTIONS, STATUS_OPTIONS } from '@/constants/deployments';
import { useListSearch } from '@/hooks/useListSearch';
import { PageProps } from '@/types';
import { Deployment } from '@/types/models';
import { Link, router, usePage } from '@inertiajs/react';
import { useEcho } from '@laravel/echo-react';
import { Avatar, Card, Empty, Spin, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ArrowRight, Boxes, CheckCircle2, Clock, Filter, Hourglass, TrendingUp, XCircle } from 'lucide-react';
import { KeyboardEvent, ReactNode, forwardRef, useImperativeHandle } from 'react';

export interface DeploymentsListHandle {
    refresh: () => void;
}

export default forwardRef<DeploymentsListHandle, {
    searchUrl: string;
    initialItems: Deployment[];
    initialKpis: DeploymentKpis;
    showApplicationColumn?: boolean;
    getRowHref: (deployment: Deployment) => string;
    actions?: ReactNode;
    emptyAction?: ReactNode;
}>(function DeploymentsList(
    { searchUrl, initialItems, initialKpis, showApplicationColumn = false, getRowHref, actions, emptyAction },
    ref,
) {
    const { workspace } = usePage<PageProps>().props;
    const search = useListSearch<Deployment, DeploymentKpis>(searchUrl, initialItems, initialKpis, {
        sort: 'created_at',
        direction: 'desc',
    });

    useImperativeHandle(ref, () => ({ refresh: search.refresh }), [search.refresh]);

    // Un déploiement qui change de statut (pending -&gt; running -&gt; succes/echec)
    // ne se reflétait auparavant qu'après un rechargement manuel de la page —
    // on rafraîchit la première page dès qu'un événement du workspace arrive,
    // plutôt que de patcher item par item (la liste est paginée/triée, un
    // simple refresh reste correct dans tous les cas).
    useEcho(
        workspace ? `workspace.${workspace.id}` : '',
        '.deploiement.statut',
        () => search.refresh(),
        [workspace?.id],
    );

    const columns: ColumnsType<Deployment> = [
        ...(showApplicationColumn
            ? [
                  {
                      title: 'Application',
                      key: 'application',
                      render: (_value: unknown, d: Deployment) => (
                          <span className="applications-table__name">
                              <Avatar
                                  size={28}
                                  src={d.target_environment.target.application?.logo_url ?? undefined}
                                  icon={!d.target_environment.target.application?.logo_url && <Boxes size={12} />}
                                  shape="square"
                              />
                              <span className="applications-table__name-text">
                                  <strong>{d.target_environment.target.application?.name ?? '—'}</strong>
                              </span>
                          </span>
                      ),
                  },
              ]
            : []),
        {
            title: 'Target → Environnement',
            key: 'target',
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
            render: (branch) => <span className="branch-chip">{branch}</span>,
        },
        {
            title: 'Source',
            dataIndex: 'trigger_source',
            key: 'trigger_source',
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
            render: (status) => <StatusTag status={status} />,
        },
        {
            title: 'Durée',
            key: 'duration',
            render: (_value, d) => formatDuration(d.duration_ms),
        },
        {
            title: 'Ouvrir',
            key: 'action',
            align: 'right',
            render: (_value, d) => (
                <Link
                    href={getRowHref(d)}
                    className="premium-table__action"
                    onClick={(e) => e.stopPropagation()}
                >
                    Ouvrir <ArrowRight size={14} />
                </Link>
            ),
        },
    ];

    return (
        <div>
            {actions}

            <KpiCollapse
                title="Indicateurs clés"
                items={[
                    { key: 'total', title: 'Total', value: search.kpis.total, icon: <Boxes size={14} /> },
                    { key: 'running', title: 'En cours', value: search.kpis.running, icon: <Clock size={14} /> },
                    { key: 'succes', title: 'Succès', value: search.kpis.succes, icon: <CheckCircle2 size={14} /> },
                    { key: 'echec', title: 'Échecs', value: search.kpis.echec, icon: <XCircle size={14} /> },
                    {
                        key: 'success_rate',
                        title: 'Taux de succès',
                        value: search.kpis.success_rate,
                        suffix: '%',
                        icon: <TrendingUp size={14} />,
                    },
                    {
                        key: 'avg_duration_ms',
                        title: 'Durée moyenne',
                        value: Math.round(search.kpis.avg_duration_ms / 1000),
                        suffix: 's',
                        icon: <Hourglass size={14} />,
                    },
                ]}
            />

            <div className="premium-list-toolbar">
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
            </div>

            {search.items.length === 0 && !search.loading ? (
                <Card>
                    <Empty description="Aucun déploiement ne correspond à ces critères">{emptyAction}</Empty>
                </Card>
            ) : (
                <>
                    <Card className="premium-table-card">
                        <Table
                            rowKey="id"
                            dataSource={search.items}
                            pagination={false}
                            sticky
                            scroll={{ y: 560, x: 'max-content' }}
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
});
