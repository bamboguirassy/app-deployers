import KpiCollapse from '@/Components/KpiCollapse';
import ListToolbar from '@/Components/ListToolbar';
import { SourceIcon, StatusDotsIcon } from '@/Components/Deployments/DeploymentIcons';
import StatusTag from '@/Components/StatusTag';
import { DeploymentKpis, formatDuration, getSourceLabel, getSourceOptions, getStatusOptions } from '@/constants/deployments';
import { useListSearch } from '@/hooks/useListSearch';
import { timeAgo } from '@/lib/time';
import { PageProps } from '@/types';
import { Deployment } from '@/types/models';
import { Link, router, usePage } from '@inertiajs/react';
import { useEcho } from '@laravel/echo-react';
import { Avatar, Card, Empty, Spin, Table, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ArrowRight, Boxes, CheckCircle2, Clock, Filter, Hourglass, TrendingUp, XCircle } from 'lucide-react';
import { KeyboardEvent, ReactNode, forwardRef, useImperativeHandle } from 'react';
import { useTranslation } from 'react-i18next';
import { dateLocale } from '@/lib/i18n';

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
    const { t, i18n } = useTranslation('deployments');
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
                      title: t('list.columns.application'),
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
            title: t('list.columns.target'),
            key: 'target',
            render: (_value, d) => (
                <span>
                    {d.target_environment.target.name} <ArrowRight size={12} style={{ verticalAlign: 'middle', opacity: 0.5 }} />{' '}
                    {d.target_environment.environment.name}
                </span>
            ),
        },
        {
            title: t('list.columns.branch'),
            dataIndex: 'branch',
            key: 'branch',
            render: (branch) => <span className="branch-chip">{branch}</span>,
        },
        {
            title: t('list.columns.source'),
            dataIndex: 'trigger_source',
            key: 'trigger_source',
            render: (source) => (
                <span className="source-chip">
                    <SourceIcon source={source} />
                    {getSourceLabel(t, source)}
                </span>
            ),
        },
        {
            title: t('list.columns.date'),
            dataIndex: 'created_at',
            key: 'created_at',
            render: (createdAt: string) => (
                <Tooltip title={new Date(createdAt).toLocaleString(dateLocale(i18n.language))}>
                    <span>{timeAgo(createdAt, t)}</span>
                </Tooltip>
            ),
        },
        {
            title: t('list.columns.status'),
            dataIndex: 'status',
            key: 'status',
            render: (status) => <StatusTag status={status} />,
        },
        {
            title: t('list.columns.duration'),
            key: 'duration',
            render: (_value, d) => formatDuration(d.duration_ms),
        },
        {
            title: t('list.columns.open'),
            key: 'action',
            align: 'right',
            render: (_value, d) => (
                <Link
                    href={getRowHref(d)}
                    className="premium-table__action"
                    onClick={(e) => e.stopPropagation()}
                >
                    {t('list.columns.open')} <ArrowRight size={14} />
                </Link>
            ),
        },
    ];

    return (
        <div>
            {actions}

            <KpiCollapse
                title={t('list.kpisTitle')}
                items={[
                    { key: 'total', title: t('list.kpis.total'), value: search.kpis.total, icon: <Boxes size={14} /> },
                    { key: 'running', title: t('list.kpis.running'), value: search.kpis.running, icon: <Clock size={14} /> },
                    { key: 'succes', title: t('list.kpis.succes'), value: search.kpis.succes, icon: <CheckCircle2 size={14} /> },
                    { key: 'echec', title: t('list.kpis.echec'), value: search.kpis.echec, icon: <XCircle size={14} /> },
                    {
                        key: 'success_rate',
                        title: t('list.kpis.successRate'),
                        value: search.kpis.success_rate,
                        suffix: '%',
                        icon: <TrendingUp size={14} />,
                    },
                    {
                        key: 'avg_duration_ms',
                        title: t('list.kpis.avgDuration'),
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
                    searchPlaceholder={t('list.toolbar.searchPlaceholder')}
                    filters={[
                        { key: 'status', placeholder: t('list.toolbar.statusPlaceholder'), options: getStatusOptions(t), icon: <StatusDotsIcon /> },
                        { key: 'trigger_source', placeholder: t('list.toolbar.sourcePlaceholder'), options: getSourceOptions(t), icon: <Filter size={14} /> },
                    ]}
                    filterValues={search.filters}
                    onFilterChange={search.setFilter}
                    sortOptions={[
                        { value: 'created_at', label: t('list.toolbar.sortDate') },
                        { value: 'duration_ms', label: t('list.toolbar.sortDuration') },
                        { value: 'status', label: t('list.toolbar.sortStatus') },
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
                    <Empty description={t('list.emptyDescription')}>{emptyAction}</Empty>
                </Card>
            ) : (
                <>
                    <Card className="premium-table-card">
                        <Table
                            rowKey="id"
                            dataSource={search.items}
                            pagination={false}
                            scroll={{ x: 'max-content' }}
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
                                <span className="section-hint">{t('list.loadingMore')}</span>
                            </>
                        )}
                        {!search.hasMore && !search.loading && search.items.length > 0 && (
                            <span className="section-hint">{t('list.allShown')}</span>
                        )}
                    </div>
                </>
            )}
        </div>
    );
});
