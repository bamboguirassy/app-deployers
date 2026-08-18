import { stepTypeIcon } from '@/constants/stepTypes';
import { PageProps } from '@/types';
import { Application, EmailStepConfig, PipelineStep } from '@/types/models';
import { router, usePage } from '@inertiajs/react';
import { Switch, Table, Tag, Tooltip, message } from 'antd';
import axios from 'axios';
import { Bell, CheckCircle2, ExternalLink, Mail, Play, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface NotificationSettings {
    notify_on_start: boolean;
    notify_on_success: boolean;
    notify_on_failure: boolean;
}

interface SystemNotificationRow {
    key: keyof NotificationSettings;
    event: string;
    recipients: string;
    channel: string;
    level: 'start' | 'success' | 'error';
}

interface EmailStepRow {
    key: string;
    targetId: number;
    targetName: string;
    stepLabel: string;
    to: string[];
    subject: string;
}

export default function NotificationsPanel({
    application,
    notificationSettings: initialSettings,
    canManage,
}: {
    application: Application;
    notificationSettings: NotificationSettings;
    canManage: boolean;
}) {
    const { t } = useTranslation('applications');
    const { workspace } = usePage<PageProps>().props;
    const [settings, setSettings] = useState<NotificationSettings>(initialSettings);
    const [saving, setSaving] = useState<Partial<Record<keyof NotificationSettings, boolean>>>({});
    const [messageApi, contextHolder] = message.useMessage();

    const toggle = async (key: keyof NotificationSettings, value: boolean) => {
        const previous = settings[key];
        // Optimistic update
        setSettings((prev) => ({ ...prev, [key]: value }));
        setSaving((prev) => ({ ...prev, [key]: true }));

        try {
            await axios.patch(
                route('notification-settings.update', [workspace!.slug, application.slug]),
                { ...settings, [key]: value },
            );
        } catch {
            // Rollback on error
            setSettings((prev) => ({ ...prev, [key]: previous }));
            messageApi.error(t('notificationsPanel.saveFailed'));
        } finally {
            setSaving((prev) => { const n = { ...prev }; delete n[key]; return n; });
        }
    };

    const systemRows: SystemNotificationRow[] = [
        {
            key: 'notify_on_start',
            event: t('notificationsPanel.system.startEvent'),
            recipients: t('notificationsPanel.system.startRecipients'),
            channel: 'Email',
            level: 'start',
        },
        {
            key: 'notify_on_success',
            event: t('notificationsPanel.system.successEvent'),
            recipients: t('notificationsPanel.system.successRecipients'),
            channel: 'Email',
            level: 'success',
        },
        {
            key: 'notify_on_failure',
            event: t('notificationsPanel.system.failureEvent'),
            recipients: t('notificationsPanel.system.failureRecipients'),
            channel: 'Email',
            level: 'error',
        },
    ];

    const emailSteps: EmailStepRow[] = application.targets.flatMap((target) =>
        (target.pipeline_steps as PipelineStep[])
            .filter((step): step is PipelineStep & { type: 'email'; config: EmailStepConfig } =>
                step.type === 'email',
            )
            .map((step) => ({
                key: `${target.id}-${step.id}`,
                targetId: target.id,
                targetName: target.name,
                stepLabel: step.label,
                to: step.config.to ?? [],
                subject: step.config.subject ?? '',
            })),
    );

    const goToStep = (targetId: number) => {
        router.visit(
            route('applications.show', [workspace!.slug, application.slug])
            + `?tab=targets&target=${targetId}`,
        );
    };

    const EventIcon = ({ level }: { level: SystemNotificationRow['level'] }) => {
        if (level === 'success') return <CheckCircle2 size={14} className="notif-event__icon notif-event__icon--success" />;
        if (level === 'error')   return <XCircle size={14} className="notif-event__icon notif-event__icon--error" />;
        return <Play size={14} className="notif-event__icon notif-event__icon--start" />;
    };

    const systemColumns = [
        {
            title: t('notificationsPanel.columns.event'),
            dataIndex: 'event',
            key: 'event',
            render: (text: string, row: SystemNotificationRow) => (
                <span className={`notif-event ${!settings[row.key] ? 'notif-event--disabled' : ''}`}>
                    <EventIcon level={row.level} />
                    {text}
                </span>
            ),
        },
        {
            title: t('notificationsPanel.columns.recipients'),
            dataIndex: 'recipients',
            key: 'recipients',
            render: (text: string, row: SystemNotificationRow) => (
                <span className={!settings[row.key] ? 'notif-muted' : undefined}>{text}</span>
            ),
        },
        {
            title: t('notificationsPanel.columns.channel'),
            dataIndex: 'channel',
            key: 'channel',
            render: (text: string, row: SystemNotificationRow) => (
                <Tag icon={<Mail size={11} />} color={settings[row.key] ? 'purple' : 'default'}>{text}</Tag>
            ),
        },
        {
            title: t('notificationsPanel.columns.enabled'),
            key: 'enabled',
            width: 80,
            render: (_: unknown, row: SystemNotificationRow) => (
                <Tooltip title={canManage ? undefined : t('notificationsPanel.noPermission')}>
                    <Switch
                        size="small"
                        checked={settings[row.key]}
                        loading={!!saving[row.key]}
                        disabled={!canManage}
                        onChange={(val) => toggle(row.key, val)}
                    />
                </Tooltip>
            ),
        },
    ];

    const emailStepColumns = [
        {
            title: t('notificationsPanel.columns.target'),
            dataIndex: 'targetName',
            key: 'targetName',
            render: (name: string, row: EmailStepRow) => (
                <span className="notif-target-link">
                    {stepTypeIcon('email', 13)}
                    <span>{name}</span>
                    <span className="notif-step-label">/ {row.stepLabel}</span>
                </span>
            ),
        },
        {
            title: t('notificationsPanel.columns.to'),
            dataIndex: 'to',
            key: 'to',
            render: (to: string[]) => to.length
                ? to.map((addr) => <Tag key={addr}>{addr}</Tag>)
                : <span className="notif-empty-cell">—</span>,
        },
        {
            title: t('notificationsPanel.columns.subject'),
            dataIndex: 'subject',
            key: 'subject',
            render: (s: string) => s || <span className="notif-empty-cell">—</span>,
        },
        ...(canManage
            ? [{
                title: '',
                key: 'actions',
                width: 40,
                render: (_: unknown, row: EmailStepRow) => (
                    <Tooltip title={t('notificationsPanel.editStepTooltip')}>
                        <button
                            type="button"
                            className="notif-goto-btn"
                            aria-label={t('notificationsPanel.editStepAriaLabel')}
                            onClick={() => goToStep(row.targetId)}
                        >
                            <ExternalLink size={13} />
                        </button>
                    </Tooltip>
                ),
            }]
            : []),
    ];

    const activeCount = Object.values(settings).filter(Boolean).length;

    return (
        <div className="application-notifications-panel application-resource-panel">
            {contextHolder}

            <div className="application-resource-header application-resource-header--notifications">
                <div>
                    <h3>{t('notificationsPanel.title')}</h3>
                    <span>{t('notificationsPanel.subtitle')}</span>
                </div>
                <div className="application-resource-header__actions">
                    <Bell size={18} aria-hidden="true" />
                </div>
            </div>

            {/* Notifications système automatiques */}
            <section className="notif-section">
                <div className="notif-section__header">
                    <h4>{t('notificationsPanel.system.title')}</h4>
                    <span className="notif-section__badge notif-section__badge--primary">
                        {t('notificationsPanel.system.activeCount', { count: activeCount, total: systemRows.length })}
                    </span>
                </div>
                <p className="notif-section__hint">{t('notificationsPanel.system.hint')}</p>

                <Table<SystemNotificationRow>
                    dataSource={systemRows}
                    columns={systemColumns}
                    pagination={false}
                    size="small"
                    className="notif-table"
                    rowKey="key"
                    rowClassName={(row) => !settings[row.key] ? 'notif-row--disabled' : ''}
                />

                {!canManage && (
                    <p className="notif-section__hint notif-section__hint--warning">
                        {t('notificationsPanel.noPermission')}
                    </p>
                )}
            </section>

            {/* Étapes Email du pipeline */}
            <section className="notif-section">
                <div className="notif-section__header">
                    <h4>{t('notificationsPanel.emailSteps.title')}</h4>
                    {emailSteps.length > 0 && (
                        <span className="notif-section__badge">
                            {emailSteps.length}
                        </span>
                    )}
                </div>
                <p className="notif-section__hint">{t('notificationsPanel.emailSteps.hint')}</p>

                {emailSteps.length === 0 ? (
                    <p className="notif-empty">{t('notificationsPanel.emailSteps.empty')}</p>
                ) : (
                    <Table<EmailStepRow>
                        dataSource={emailSteps}
                        columns={emailStepColumns}
                        pagination={false}
                        size="small"
                        className="notif-table"
                        rowKey="key"
                    />
                )}
            </section>
        </div>
    );
}
