import AdminLayout from '@/Layouts/AdminLayout';
import { useInfiniteScroll, type Paginated } from '@/hooks/useInfiniteScroll';
import { Head, router } from '@inertiajs/react';
import { Card, Empty, Input, Select, Spin, Tag, Typography } from 'antd';
import { ScrollText } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const { Title, Paragraph, Text } = Typography;

interface LogEntry {
    id: string;
    timestamp: string;
    env: string;
    level: string;
    message: string;
}

interface Filters {
    level?: string;
    search?: string;
}

const LEVEL_COLORS: Record<string, string> = {
    EMERGENCY: 'red',
    ALERT: 'red',
    CRITICAL: 'red',
    ERROR: 'red',
    WARNING: 'gold',
    NOTICE: 'blue',
    INFO: 'blue',
    DEBUG: 'default',
};

const LEVELS = ['EMERGENCY', 'ALERT', 'CRITICAL', 'ERROR', 'WARNING', 'NOTICE', 'INFO', 'DEBUG'];

export default function Logs({
    files,
    selectedFile,
    entries,
    filters,
}: {
    files: { value: string; label: string }[];
    selectedFile: string | null;
    entries: Paginated<LogEntry>;
    filters: Filters;
}) {
    const { t } = useTranslation('admin');
    const { items, sentinelRef, loading, hasMore } = useInfiniteScroll(entries, 'entries');
    const [search, setSearch] = useState(filters.search ?? '');
    const isFirstRender = useRef(true);

    function applyFilter(updates: Partial<Filters & { file: string }>) {
        router.get(
            route('admin.logs'),
            { file: selectedFile, ...filters, ...updates },
            { preserveScroll: true, replace: true, only: ['entries', 'selectedFile', 'filters'] },
        );
    }

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        const handle = setTimeout(() => applyFilter({ search: search || undefined }), 300);
        return () => clearTimeout(handle);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    return (
        <AdminLayout breadcrumbs={[{ label: t('logs.breadcrumb') }]}>
            <Head title={t('logs.title')} />

            <div className="premium-list-hero">
                <div>
                    <div className="premium-list-eyebrow">{t('logs.eyebrow')}</div>
                    <Title level={2} style={{ margin: 0 }}>
                        {t('logs.heading')}
                    </Title>
                    <Paragraph type="secondary" style={{ margin: '6px 0 0' }}>
                        {t('logs.subtitle')}
                    </Paragraph>
                </div>
            </div>

            <Card
                className="premium-table-card"
                styles={{ body: { padding: 0 } }}
                title={
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                        <Select
                            placeholder={t('logs.filePlaceholder')}
                            style={{ minWidth: 200 }}
                            value={selectedFile ?? undefined}
                            onChange={(file) => applyFilter({ file, search: undefined, level: undefined })}
                            options={files}
                            disabled={files.length === 0}
                        />
                        <Select
                            allowClear
                            placeholder={t('logs.levelPlaceholder')}
                            style={{ minWidth: 180 }}
                            value={filters.level || undefined}
                            onChange={(v) => applyFilter({ level: v ?? undefined })}
                            options={LEVELS.map((l) => ({ value: l, label: l }))}
                        />
                        <Input.Search
                            allowClear
                            placeholder={t('logs.searchPlaceholder')}
                            style={{ minWidth: 280 }}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                }
            >
                {files.length === 0 ? (
                    <Empty description={t('logs.noFiles')} style={{ padding: 40 }}>
                        <ScrollText size={32} style={{ marginBottom: 8, opacity: 0.3 }} />
                    </Empty>
                ) : items.length === 0 ? (
                    <Empty description={t('logs.empty')} style={{ padding: 40 }}>
                        <ScrollText size={32} style={{ marginBottom: 8, opacity: 0.3 }} />
                    </Empty>
                ) : (
                    <div>
                        {items.map((entry) => (
                            <div
                                key={entry.id}
                                style={{
                                    padding: '10px 16px',
                                    borderBottom: '1px solid var(--color-border)',
                                    fontFamily: 'monospace',
                                    fontSize: 12,
                                }}
                            >
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                                    <Text type="secondary">{entry.timestamp}</Text>
                                    <Tag color={LEVEL_COLORS[entry.level] ?? 'default'}>{entry.level}</Tag>
                                    <Text type="secondary" style={{ fontSize: 11 }}>
                                        {entry.env}
                                    </Text>
                                </div>
                                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                    {entry.message}
                                </pre>
                            </div>
                        ))}

                        <div ref={sentinelRef} style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
                            {loading && <Spin size="small" />}
                            {!loading && !hasMore && (
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    {t('logs.endOfList')}
                                </Text>
                            )}
                        </div>
                    </div>
                )}
            </Card>
        </AdminLayout>
    );
}
