import KpiCollapse from '@/Components/KpiCollapse';
import ListToolbar from '@/Components/ListToolbar';
import StatusTag from '@/Components/StatusTag';
import { useListSearch } from '@/hooks/useListSearch';
import { timeAgo } from '@/lib/time';
import { PageProps } from '@/types';
import { Application } from '@/types/models';
import { Link, usePage } from '@inertiajs/react';
import { Avatar, Empty, Spin } from 'antd';
import { Boxes, GitBranch, Layers } from 'lucide-react';
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

    return (
        <div>
            <KpiCollapse
                title={t('list.kpiTitle')}
                subtitle={t('list.kpiSubtitle')}
                items={[
                    { key: 'total', title: t('list.kpiTotal'), value: search.kpis.total, icon: <Boxes size={14} /> },
                    { key: 'without_targets', title: t('list.kpiWithoutTargets'), value: search.kpis.without_targets, icon: <Layers size={14} /> },
                    { key: 'with_recent_deployment', title: t('list.kpiRecentDeployments'), value: search.kpis.with_recent_deployment, icon: <GitBranch size={14} /> },
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
                <div className="app-grid-empty">
                    <Empty description={t('list.emptyDescription')}>{emptyAction}</Empty>
                </div>
            ) : (
                <>
                    <div className="app-grid">
                        {search.items.map((app) => (
                            <Link
                                key={app.id}
                                href={route('applications.show', [workspace!.slug, app.slug])}
                                className="app-card"
                            >
                                {/* Status accent bar */}
                                {app.last_deployment_status && (
                                    <div className={`app-card__accent app-card__accent--${app.last_deployment_status}`} />
                                )}

                                {/* Header */}
                                <div className="app-card__header">
                                    <Avatar
                                        size={44}
                                        src={app.logo_url ?? undefined}
                                        icon={!app.logo_url && <Boxes size={16} />}
                                        shape="square"
                                        className="app-card__avatar"
                                    />
                                    <div className="app-card__identity">
                                        <strong className="app-card__name">{app.name}</strong>
                                        <span className="app-card__slug">/{app.slug}</span>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="app-card__footer">
                                    <div className="app-card__badges">
                                        <span className="app-card__badge">
                                            <GitBranch size={11} />
                                            {app.targets_count ?? 0}
                                        </span>
                                        <span className="app-card__badge">
                                            <Layers size={11} />
                                            {app.environments_count ?? 0}
                                        </span>
                                    </div>
                                    <div className="app-card__status">
                                        {app.last_deployment_status ? (
                                            <>
                                                <StatusTag status={app.last_deployment_status} size={11} />
                                                {app.last_deployment_at && (
                                                    <span className="app-card__time">{timeAgo(app.last_deployment_at, t)}</span>
                                                )}
                                            </>
                                        ) : (
                                            <span className="app-card__no-deploy">{t('list.noDeployment')}</span>
                                        )}
                                    </div>
                                </div>
                            </Link>
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
        </div>
    );
});
