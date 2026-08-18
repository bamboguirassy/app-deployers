import KpiCollapse from '@/Components/KpiCollapse';
import ListToolbar from '@/Components/ListToolbar';
import { ROLE_COLORS, getRoleLabel, getRoleOptions } from '@/constants/members';
import { useConfirm } from '@/theme/ConfirmContext';
import { useListSearch } from '@/hooks/useListSearch';
import { PageProps, User } from '@/types';
import { router, usePage } from '@inertiajs/react';
import { Avatar, Button, Card, Space, Spin, Table, Tag, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckCircle2, KeyRound, ShieldAlert, ShieldCheck, Users as UsersIcon, XCircle } from 'lucide-react';
import { forwardRef, useImperativeHandle } from 'react';
import { useTranslation } from 'react-i18next';
import { dateLocale } from '@/lib/i18n';

const { Text } = Typography;

export interface UserKpis {
    total: number;
    owner: number;
    manager: number;
    deployer: number;
    viewer: number;
}

export interface UsersListHandle {
    refresh: () => void;
}

export default forwardRef<UsersListHandle, {
    searchUrl: string;
    initialItems: User[];
    initialKpis: UserKpis;
    getRowHref: (user: User) => string;
}>(function UsersList({ searchUrl, initialItems, initialKpis, getRowHref }, ref) {
    const { t, i18n } = useTranslation('users');
    const { workspace } = usePage<PageProps>().props;
    const confirm = useConfirm();
    const search = useListSearch<User, UserKpis>(searchUrl, initialItems, initialKpis, {
        sort: 'name',
        direction: 'asc',
    });

    useImperativeHandle(ref, () => ({ refresh: search.refresh }), [search.refresh]);

    const sendPasswordReset = (user: User) =>
        confirm.confirm({
            title: t('list.confirms.resetPassword.title'),
            content: t('list.confirms.resetPassword.content', { email: user.email }),
            okText: t('list.confirms.resetPassword.okText'),
            cancelText: t('list.confirms.resetPassword.cancelText'),
            onOk: () => router.post(route('users.send-password-reset', [workspace!.slug, user.uuid])),
        });

    const columns: ColumnsType<User> = [
        {
            title: t('list.columns.user'),
            key: 'user',
            render: (_value, user) => (
                <button type="button" className="premium-table__name" onClick={() => router.visit(getRowHref(user))}>
                    <Avatar size={40}>{user.name.charAt(0).toUpperCase()}</Avatar>
                    <span>
                        <strong>{user.name}</strong>
                        <small>{user.email}</small>
                    </span>
                </button>
            ),
        },
        {
            title: t('list.columns.emailVerified'),
            key: 'verified',
            align: 'center',
            render: (_value, user) =>
                user.email_verified_at ? (
                    <span className="premium-table__status premium-table__status--success">
                        <CheckCircle2 size={16} /> {t('list.verified')}
                    </span>
                ) : (
                    <span className="premium-table__status premium-table__status--muted">
                        <XCircle size={16} /> {t('list.pending')}
                    </span>
                ),
        },
        {
            title: t('list.columns.role'),
            key: 'role',
            render: (_value, user) => (user.role ? <Tag color={ROLE_COLORS[user.role]}>{getRoleLabel(t, user.role)}</Tag> : '—'),
        },
        {
            title: t('list.columns.provider'),
            key: 'provider',
            align: 'center',
            render: (_value, user) => (
                <Tag color={user.google_id ? 'blue' : 'default'}>
                    {user.google_id ? t('list.provider.google') : t('list.provider.email')}
                </Tag>
            ),
        },
        {
            title: t('list.columns.applications'),
            key: 'applications',
            render: (_value, user) => (
                <Space size={4} wrap>
                    {(user.applications ?? []).map((a) => (
                        <Tag key={a.application_slug} className="premium-table__tag">
                            {a.application_name}
                        </Tag>
                    ))}
                    {(user.applications ?? []).length === 0 && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {t('list.none')}
                        </Text>
                    )}
                </Space>
            ),
        },
        {
            title: t('list.columns.status'),
            key: 'status',
            align: 'center',
            render: (_value, user) =>
                user.suspended_at ? (
                    <span className="premium-table__status premium-table__status--danger">
                        <ShieldAlert size={16} /> {t('list.suspended')}
                    </span>
                ) : (
                    <span className="premium-table__status premium-table__status--success">
                        <ShieldCheck size={16} /> {t('list.active')}
                    </span>
                ),
        },
        {
            title: t('list.columns.registration'),
            key: 'created_at',
            render: (_value, user) => (user.created_at ? new Date(user.created_at).toLocaleDateString(dateLocale(i18n.language)) : '—'),
        },
        {
            title: t('list.columns.actions'),
            key: 'actions',
            align: 'center',
            render: (_value, user) => (
                <Tooltip title={t('list.resetPasswordTooltip')}>
                    <Button
                        type="text"
                        size="small"
                        icon={<KeyRound size={15} />}
                        onClick={(e) => { e.stopPropagation(); sendPasswordReset(user); }}
                        aria-label={t('list.resetPasswordTooltip')}
                    />
                </Tooltip>
            ),
        },
    ];

    return (
        <div>
            <KpiCollapse
                items={[
                    { key: 'total', title: t('list.kpis.total'), value: search.kpis.total, icon: <UsersIcon size={14} /> },
                    { key: 'owner', title: t('list.kpis.owners'), value: search.kpis.owner, icon: <ShieldCheck size={14} /> },
                    { key: 'manager', title: t('list.kpis.managers'), value: search.kpis.manager, icon: <ShieldCheck size={14} /> },
                    { key: 'deployer', title: t('list.kpis.deployers'), value: search.kpis.deployer, icon: <ShieldCheck size={14} /> },
                    { key: 'viewer', title: t('list.kpis.viewers'), value: search.kpis.viewer, icon: <ShieldAlert size={14} /> },
                ]}
            />

            <div className="premium-list-toolbar">
                <ListToolbar
                    search={search.search}
                    onSearchChange={search.setSearch}
                    searchPlaceholder={t('list.searchPlaceholder')}
                    filters={[{ key: 'status', placeholder: t('list.rolePlaceholder'), options: getRoleOptions(t), icon: <ShieldCheck size={14} /> }]}
                    filterValues={search.filters}
                    onFilterChange={search.setFilter}
                    sortOptions={[
                        { value: 'name', label: t('list.sort.name') },
                        { value: 'email', label: t('list.sort.email') },
                    ]}
                    sort={search.sort}
                    direction={search.direction}
                    onSortChange={search.setSort}
                    onDirectionToggle={() => search.setDirection(search.direction === 'asc' ? 'desc' : 'asc')}
                    onReset={search.resetFilters}
                    hasActiveFilters={search.hasActiveFilters}
                />
            </div>

            <Card className="premium-table-card">
                <Table rowKey="id" dataSource={search.items} pagination={false} columns={columns} className="premium-table" scroll={{ x: 'max-content' }} />
            </Card>

            <div ref={search.sentinelRef} style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
                {search.loading && <Spin size="small" />}
                {!search.hasMore && !search.loading && search.items.length > 0 && (
                    <span className="section-hint">{t('list.allShown')}</span>
                )}
                {!search.loading && search.items.length === 0 && (
                    <span className="section-hint">{t('list.noMatch')}</span>
                )}
            </div>
        </div>
    );
});
