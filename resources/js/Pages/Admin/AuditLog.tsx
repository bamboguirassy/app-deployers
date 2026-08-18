import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router } from '@inertiajs/react';
import { Card, DatePicker, Empty, Select, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { ScrollText } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const { Title, Paragraph, Text } = Typography;
const { RangePicker } = DatePicker;

interface AuditAdmin {
    id: number;
    name: string;
    email: string;
}

interface AuditEntry {
    id: number;
    action: string;
    subject_type: string;
    subject_id: string | number;
    changes: Record<string, unknown> | null;
    ip_address: string | null;
    created_at: string;
    user: AuditAdmin | null;
}

interface Filters {
    action?: string;
    user_id?: string;
    from?: string;
    to?: string;
}

interface PaginatedLogs {
    data: AuditEntry[];
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
}

export default function AuditLog({
    logs,
    distinctActions,
    admins,
    filters,
}: {
    logs: PaginatedLogs;
    distinctActions: string[];
    admins: AuditAdmin[];
    filters: Filters;
}) {
    const { t } = useTranslation('admin');

    function applyFilter(updates: Partial<Filters>) {
        router.get(route('admin.audit-log'), { ...filters, ...updates }, { preserveScroll: true, replace: true });
    }

    const columns: ColumnsType<AuditEntry> = [
        {
            title: t('auditLog.columns.date'),
            dataIndex: 'created_at',
            key: 'created_at',
            width: 170,
            render: (v: string) => dayjs(v).format('DD/MM/YYYY HH:mm:ss'),
        },
        {
            title: t('auditLog.columns.admin'),
            key: 'user',
            width: 200,
            render: (_v, row) =>
                row.user ? (
                    <span>
                        <Text strong>{row.user.name}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {row.user.email}
                        </Text>
                    </span>
                ) : (
                    <Text type="secondary">—</Text>
                ),
        },
        {
            title: t('auditLog.columns.action'),
            dataIndex: 'action',
            key: 'action',
            width: 200,
            render: (v: string) => <code style={{ fontSize: 12 }}>{v}</code>,
        },
        {
            title: t('auditLog.columns.subject'),
            key: 'subject',
            render: (_v, row) => (
                <Text type="secondary" style={{ fontSize: 12 }}>
                    {row.subject_type} #{row.subject_id}
                </Text>
            ),
        },
        {
            title: t('auditLog.columns.changes'),
            key: 'changes',
            render: (_v, row) =>
                row.changes && Object.keys(row.changes).length > 0 ? (
                    <pre style={{ fontSize: 11, margin: 0, whiteSpace: 'pre-wrap', maxWidth: 320 }}>
                        {JSON.stringify(row.changes, null, 2)}
                    </pre>
                ) : (
                    <Text type="secondary">—</Text>
                ),
        },
        {
            title: t('auditLog.columns.ip'),
            dataIndex: 'ip_address',
            key: 'ip_address',
            width: 130,
            render: (v: string | null) => <Text type="secondary">{v ?? '—'}</Text>,
        },
    ];

    return (
        <AdminLayout breadcrumbs={[{ label: t('auditLog.breadcrumb') }]}>
            <Head title={t('auditLog.title')} />

            <div className="premium-list-hero">
                <div>
                    <div className="premium-list-eyebrow">{t('auditLog.eyebrow')}</div>
                    <Title level={2} style={{ margin: 0 }}>
                        {t('auditLog.heading')}
                    </Title>
                    <Paragraph type="secondary" style={{ margin: '6px 0 0' }}>
                        {t('auditLog.subtitle')}
                    </Paragraph>
                </div>
            </div>

            <Card
                className="premium-table-card"
                styles={{ body: { padding: '16px 16px 0' } }}
                title={
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                        <Select
                            allowClear
                            placeholder={t('auditLog.filters.actionPlaceholder')}
                            style={{ minWidth: 200 }}
                            value={filters.action || undefined}
                            onChange={(v) => applyFilter({ action: v ?? undefined })}
                            options={distinctActions.map((a) => ({ value: a, label: a }))}
                        />
                        <Select
                            allowClear
                            placeholder={t('auditLog.filters.adminPlaceholder')}
                            style={{ minWidth: 200 }}
                            value={filters.user_id ? Number(filters.user_id) : undefined}
                            onChange={(v) => applyFilter({ user_id: v ? String(v) : undefined })}
                            options={admins.map((a) => ({ value: a.id, label: `${a.name} (${a.email})` }))}
                        />
                        <RangePicker
                            value={[
                                filters.from ? dayjs(filters.from) : null,
                                filters.to ? dayjs(filters.to) : null,
                            ]}
                            onChange={(dates) =>
                                applyFilter({
                                    from: dates?.[0]?.format('YYYY-MM-DD') ?? undefined,
                                    to: dates?.[1]?.format('YYYY-MM-DD') ?? undefined,
                                })
                            }
                            format="DD/MM/YYYY"
                        />
                    </div>
                }
            >
                {logs.data.length > 0 ? (
                    <Table
                        rowKey="id"
                        dataSource={logs.data}
                        columns={columns}
                        className="premium-table"
                        scroll={{ x: 'max-content' }}
                        pagination={{
                            current: logs.current_page,
                            pageSize: logs.per_page,
                            total: logs.total,
                            showTotal: (total) => t('auditLog.total', { count: total }),
                            onChange: (page) =>
                                router.get(
                                    route('admin.audit-log'),
                                    { ...filters, page },
                                    { preserveScroll: true, replace: true },
                                ),
                        }}
                    />
                ) : (
                    <Empty description={t('auditLog.empty')} style={{ padding: 40 }}>
                        <ScrollText size={32} style={{ marginBottom: 8, opacity: 0.3 }} />
                    </Empty>
                )}
            </Card>
        </AdminLayout>
    );
}
