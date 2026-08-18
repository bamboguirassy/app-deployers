import AdminLayout from '@/Layouts/AdminLayout';
import { Head } from '@inertiajs/react';
import { Alert, Badge, Card, Empty, Table, Tag, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/fr';
import { AlertTriangle, CheckCircle2, Clock, HeartPulse, Radio, ServerCrash } from 'lucide-react';
import { useTranslation } from 'react-i18next';

dayjs.extend(relativeTime);
dayjs.locale('fr');

const { Title, Paragraph, Text } = Typography;

interface FailedJob {
    id: number;
    uuid: string;
    queue: string;
    failed_at: string;
    exception_excerpt: string;
}

interface QueueSize {
    queue: string;
    count: number;
    oldest_at: number | null;
}

interface StuckDeployment {
    uuid: string;
    started_at: string;
    updated_at: string;
    minutes_running: number;
    target: string | null;
    environment: string | null;
    application: string | null;
}

export default function SystemHealth({
    failedJobs,
    failedJobsTotal,
    queueSizes,
    stuckDeployments,
    stuckThresholdMinutes,
    reverbOnline,
    reverbHost,
    reverbPort,
}: {
    failedJobs: FailedJob[];
    failedJobsTotal: number;
    queueSizes: QueueSize[];
    stuckDeployments: StuckDeployment[];
    stuckThresholdMinutes: number;
    reverbOnline: boolean;
    reverbHost: string;
    reverbPort: number;
}) {
    const { t } = useTranslation('admin');

    const failedJobColumns: ColumnsType<FailedJob> = [
        {
            title: t('systemHealth.failedJobs.columns.failedAt'),
            dataIndex: 'failed_at',
            key: 'failed_at',
            width: 170,
            render: (v: string) => dayjs(v).format('DD/MM/YYYY HH:mm:ss'),
        },
        {
            title: t('systemHealth.failedJobs.columns.queue'),
            dataIndex: 'queue',
            key: 'queue',
            width: 120,
            render: (v: string) => <Tag>{v}</Tag>,
        },
        {
            title: t('systemHealth.failedJobs.columns.exception'),
            dataIndex: 'exception_excerpt',
            key: 'exception_excerpt',
            render: (v: string) => (
                <Tooltip title={<pre style={{ fontSize: 11, maxWidth: 500, whiteSpace: 'pre-wrap' }}>{v}</pre>} placement="topLeft">
                    <Text type="danger" style={{ fontSize: 12 }}>
                        {v.split('\n')[0].slice(0, 120)}…
                    </Text>
                </Tooltip>
            ),
        },
    ];

    const queueColumns: ColumnsType<QueueSize> = [
        {
            title: t('systemHealth.queues.columns.queue'),
            dataIndex: 'queue',
            key: 'queue',
            render: (v: string) => <Tag>{v}</Tag>,
        },
        {
            title: t('systemHealth.queues.columns.pending'),
            dataIndex: 'count',
            key: 'count',
            align: 'right',
            render: (v: number) => (
                <Text strong style={{ color: v > 0 ? 'var(--color-warning)' : undefined }}>
                    {v}
                </Text>
            ),
        },
        {
            title: t('systemHealth.queues.columns.oldestAt'),
            dataIndex: 'oldest_at',
            key: 'oldest_at',
            render: (v: number | null) =>
                v ? (
                    <Text type="secondary">{dayjs.unix(v).format('DD/MM HH:mm')}</Text>
                ) : (
                    <Text type="secondary">—</Text>
                ),
        },
    ];

    const stuckColumns: ColumnsType<StuckDeployment> = [
        {
            title: t('systemHealth.stuckDeployments.columns.application'),
            key: 'application',
            render: (_v, row) => (
                <Text>
                    {row.application ?? '—'} / {row.target ?? '—'} → {row.environment ?? '—'}
                </Text>
            ),
        },
        {
            title: t('systemHealth.stuckDeployments.columns.startedAt'),
            dataIndex: 'started_at',
            key: 'started_at',
            width: 160,
            render: (v: string) => dayjs(v).format('DD/MM/YYYY HH:mm'),
        },
        {
            title: t('systemHealth.stuckDeployments.columns.duration'),
            dataIndex: 'minutes_running',
            key: 'minutes_running',
            width: 120,
            align: 'right',
            render: (v: number) => (
                <Text type="danger">
                    <Clock size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    {v} min
                </Text>
            ),
        },
    ];

    const hasIssues = failedJobsTotal > 0 || stuckDeployments.length > 0 || !reverbOnline;

    return (
        <AdminLayout breadcrumbs={[{ label: t('systemHealth.breadcrumb') }]}>
            <Head title={t('systemHealth.title')} />

            <div className="premium-list-hero">
                <div>
                    <div className="premium-list-eyebrow">{t('systemHealth.eyebrow')}</div>
                    <Title level={2} style={{ margin: 0 }}>
                        {t('systemHealth.heading')}
                    </Title>
                    <Paragraph type="secondary" style={{ margin: '6px 0 0' }}>
                        {t('systemHealth.subtitle')}
                    </Paragraph>
                </div>
            </div>

            {!hasIssues && (
                <Alert
                    type="success"
                    showIcon
                    icon={<CheckCircle2 size={16} />}
                    message={t('systemHealth.allGood')}
                    style={{ marginBottom: 16 }}
                />
            )}

            {/* Reverb */}
            <Card
                title={
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Radio size={16} />
                        {t('systemHealth.reverb.cardTitle')}
                    </span>
                }
                className="premium-table-card"
                style={{ marginBottom: 16 }}
                extra={
                    reverbOnline ? (
                        <Badge status="success" text={t('systemHealth.reverb.online')} />
                    ) : (
                        <Badge status="error" text={t('systemHealth.reverb.offline')} />
                    )
                }
            >
                <Text type="secondary">
                    {t('systemHealth.reverb.address', { host: reverbHost, port: reverbPort })}
                </Text>
                {!reverbOnline && (
                    <Alert
                        type="warning"
                        showIcon
                        message={t('systemHealth.reverb.offlineHint')}
                        style={{ marginTop: 12 }}
                    />
                )}
            </Card>

            {/* Files d'attente */}
            <Card
                title={
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <HeartPulse size={16} />
                        {t('systemHealth.queues.cardTitle')}
                    </span>
                }
                className="premium-table-card"
                style={{ marginBottom: 16 }}
            >
                {queueSizes.length > 0 ? (
                    <Table
                        rowKey="queue"
                        dataSource={queueSizes}
                        columns={queueColumns}
                        className="premium-table"
                        pagination={false}
                        scroll={{ x: 'max-content' }}
                    />
                ) : (
                    <Empty description={t('systemHealth.queues.empty')} style={{ padding: 24 }} />
                )}
            </Card>

            {/* Déploiements bloqués */}
            <Card
                title={
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <AlertTriangle size={16} />
                        {t('systemHealth.stuckDeployments.cardTitle', { minutes: stuckThresholdMinutes })}
                    </span>
                }
                className="premium-table-card"
                style={{ marginBottom: 16 }}
                extra={
                    stuckDeployments.length > 0 ? (
                        <Badge count={stuckDeployments.length} color="var(--color-danger)" />
                    ) : (
                        <Badge status="success" text={t('systemHealth.stuckDeployments.none')} />
                    )
                }
            >
                {stuckDeployments.length > 0 ? (
                    <Table
                        rowKey="uuid"
                        dataSource={stuckDeployments}
                        columns={stuckColumns}
                        className="premium-table"
                        pagination={false}
                        scroll={{ x: 'max-content' }}
                    />
                ) : (
                    <Empty description={t('systemHealth.stuckDeployments.empty')} style={{ padding: 24 }} />
                )}
            </Card>

            {/* Jobs en échec */}
            <Card
                title={
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ServerCrash size={16} />
                        {t('systemHealth.failedJobs.cardTitle')}
                    </span>
                }
                className="premium-table-card"
                extra={
                    failedJobsTotal > 0 ? (
                        <Badge count={failedJobsTotal} color="var(--color-danger)" overflowCount={999} />
                    ) : (
                        <Badge status="success" text={t('systemHealth.failedJobs.none')} />
                    )
                }
            >
                {failedJobs.length > 0 ? (
                    <Table
                        rowKey="id"
                        dataSource={failedJobs}
                        columns={failedJobColumns}
                        className="premium-table"
                        pagination={false}
                        scroll={{ x: 'max-content' }}
                    />
                ) : (
                    <Empty description={t('systemHealth.failedJobs.empty')} style={{ padding: 24 }} />
                )}
            </Card>
        </AdminLayout>
    );
}
