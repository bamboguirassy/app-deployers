import KpiCollapse from '@/Components/KpiCollapse';
import ListToolbar from '@/Components/ListToolbar';
import StatusTag from '@/Components/StatusTag';
import { useListSearch } from '@/hooks/useListSearch';
import { timeAgo } from '@/lib/time';
import { PageProps } from '@/types';
import { Application } from '@/types/models';
import { Link, usePage } from '@inertiajs/react';
import { Avatar, Card, Empty, Spin, Table, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Boxes, ChevronRight, GitBranch, Layers } from 'lucide-react';
import { ReactNode, forwardRef, useImperativeHandle } from 'react';
import { useTranslation } from 'react-i18next';

export interface ApplicationKpis {
    total: number;
    without_targets: number;
    with_recent_deployment: number;
}

export interface ApplicationsListHandle {
    refresh: () => void;
}

export default forwardRef<ApplicationsListHandle, {
    searchUrl: string;
    initialItems: Application[];
    initialKpis: ApplicationKpis;
    emptyAction?: ReactNode;
}>(function ApplicationsList({ searchUrl, initialItems, initialKpis, emptyAction }, ref) {
    const { t } = useTranslation('applications');
    const { workspace } = usePage<PageProps>().props;
    const search = useListSearch<Application, ApplicationKpis>(searchUrl, initialItems, initialKpis, {
        sort: 'created_at',
        direction: 'desc',
    });

    useImperativeHandle(ref, () => ({ refresh: search.refresh }), [search.refresh]);

    const columns: ColumnsType<Application> = [
        {
            title: t('list.nameColumn'),
            dataIndex: 'name',
            key: 'name',
            width: 300,
            render: (_value, application) => (
                <Link href={route('applications.show', [workspace!.slug, application.slug])} className="applications-table__name">
                    <Avatar
                        size={40}
                        src={application.logo_url ?? undefined}
                        icon={!application.logo_url && <Boxes size={14} />}
                        shape="square"
                    />
                    <span className="applications-table__name-text">
                        <strong>{application.name}</strong>
                        <small>{t('list.openRecord')}</small>
                    </span>
                </Link>
            ),
            fixed: 'left',
        },
        {
            title: t('list.targetsColumn'),
            dataIndex: 'targets_count',
            key: 'targets_count',
            align: 'center',
            render: (value: Application['targets_count']) => (
                <div className="applications-table__metric">
                    <span className="applications-table__metric-icon">
                        <GitBranch size={14} />
                    </span>
                    <div>
                        <strong>{value ?? 0}</strong>
                        <small>{t('list.targetsUnit')}</small>
                    </div>
                </div>
            ),
            width: 150,
        },
        {
            title: t('list.environmentsColumn'),
            dataIndex: 'environments_count',
            key: 'environments_count',
            align: 'center',
            render: (value: Application['environments_count']) => (
                <div className="applications-table__metric">
                    <span className="applications-table__metric-icon">
                        <Layers size={14} />
                    </span>
                    <div>
                        <strong>{value ?? 0}</strong>
                        <small>{t('list.environmentsUnit')}</small>
                    </div>
                </div>
            ),
            width: 200,
        },
        {
            title: t('list.lastDeploymentColumn'),
            key: 'status',
            align: 'center',
            width: 150,
            render: (_value, application) =>
                application.last_deployment_status ? (
                    <Tooltip title={application.last_deployment_at ? timeAgo(application.last_deployment_at) : undefined}>
                        <span>
                            <StatusTag status={application.last_deployment_status} size={13} />
                        </span>
                    </Tooltip>
                ) : (
                    <span className="premium-table__status premium-table__status--muted">{t('list.noDeployment')}</span>
                ),
        },
        {
            title: t('list.descriptionColumn'),
            dataIndex: 'description',
            key: 'description',
            render: (value: Application['description']) => (
                <span className="applications-table__description">{value || t('list.noDescription')}</span>
            ),
            width: 300,
        },
        {
            title: t('list.openColumn'),
            key: 'action',
            align: 'right',
            width: 100,
            fixed: 'right',
            render: (_value, application) => (
                <Link href={route('applications.show', [workspace!.slug, application.slug])} className="applications-table__action">
                    {t('list.openColumn')} <ChevronRight size={14} />
                </Link>
            ),
        },
    ];

    return (
        <div>
            <KpiCollapse
                title={t('list.kpiTitle')}
                subtitle={t('list.kpiSubtitle')}
                items={[
                    { key: 'total', title: t('list.kpiTotal'), value: search.kpis.total, icon: <Boxes size={14} /> },
                    {
                        key: 'without_targets',
                        title: t('list.kpiWithoutTargets'),
                        value: search.kpis.without_targets,
                        icon: <Layers size={14} />,
                    },
                    {
                        key: 'with_recent_deployment',
                        title: t('list.kpiRecentDeployments'),
                        value: search.kpis.with_recent_deployment,
                        icon: <GitBranch size={14} />,
                    },
                ]}
            />

            <div className="applications-list-toolbar">
                <ListToolbar
                    search={search.search}
                    onSearchChange={search.setSearch}
                    searchPlaceholder={t('list.searchPlaceholder')}
                    filterValues={search.filters}
                    onFilterChange={search.setFilter}
                    sortOptions={[
                        { value: 'created_at', label: t('list.sortCreatedAt') },
                        { value: 'name', label: t('list.sortName') },
                        { value: 'targets_count', label: t('list.sortTargetsCount') },
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
                    <Card className="applications-table-card premium-table-card">
                        <Table
                            className="applications-table premium-table"
                            columns={columns}
                            dataSource={search.items}
                            rowKey="id"
                            pagination={false}
                            loading={search.loading}
                            tableLayout="fixed"
                            scroll={{ x: 980 }}
                            showHeader
                        />
                    </Card>

                    <div ref={search.sentinelRef} style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
                        {search.loading && <Spin size="small" />}
                        {!search.hasMore && !search.loading && search.items.length > 0 && (
                            <span className="section-hint">{t('list.allShown')}</span>
                        )}
                    </div>
                </>
            )}
        </div>
    );
});
