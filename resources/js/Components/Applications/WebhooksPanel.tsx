import ProviderLogo from '@/Components/Applications/ProviderLogo';
import { useConfirm } from '@/theme/ConfirmContext';
import { PageProps } from '@/types';
import { Application, Target, WebhookConfig } from '@/types/models';
import { router, usePage } from '@inertiajs/react';
import { CheckCircle2, Eye, EyeOff, Trash2 } from 'lucide-react';
import { Button, Tag, Tooltip, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

function WebhookUrlReveal({ application, webhook }: { application: Application; webhook: WebhookConfig }) {
    const { t } = useTranslation('applications');
    const { workspace } = usePage<PageProps>().props;
    const [revealed, setRevealed] = useState<{ secret: string; url: string } | null>(null);
    const [loading, setLoading] = useState(false);

    const reveal = () => {
        setLoading(true);
        import('axios')
            .then(({ default: axios }) =>
                axios.post(route('webhook-configs.reveal-secret', [workspace!.slug, application.slug, webhook.uuid]))
            )
            .then((res) => setRevealed(res.data))
            .finally(() => setLoading(false));
    };

    if (!revealed) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    {t('webhooksPanel.urlLabel')}
                </Text>
                <Text code style={{ fontSize: 12 }}>
                    {route('webhooks.receive', [webhook.provider, webhook.uuid])}
                </Text>
                <Button size="small" type="text" icon={<Eye size={13} />} loading={loading} onClick={reveal}>
                    {t('webhooksPanel.revealSecret')}
                </Button>
            </div>
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    {t('webhooksPanel.urlLabel')}
                </Text>
                <Text code copyable style={{ fontSize: 12 }}>
                    {revealed.url}
                </Text>
                <Button size="small" type="text" icon={<EyeOff size={13} />} onClick={() => setRevealed(null)}>
                    {t('webhooksPanel.hide')}
                </Button>
            </div>
            {webhook.provider !== 'bitbucket' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {t('webhooksPanel.secretToPaste', { provider: webhook.provider === 'github' ? 'GitHub' : 'GitLab' })}
                    </Text>
                    <Text code copyable style={{ fontSize: 12 }}>
                        {revealed.secret}
                    </Text>
                </div>
            )}
        </div>
    );
}

const PROVIDERS: { value: WebhookConfig['provider']; label: string }[] = [
    { value: 'github', label: 'GitHub' },
    { value: 'gitlab', label: 'GitLab' },
    { value: 'bitbucket', label: 'Bitbucket' },
];

export default function WebhooksPanel({
    application,
    target,
    canManage,
}: {
    application: Application;
    target: Target;
    canManage: boolean;
}) {
    const { t } = useTranslation('applications');
    const { workspace } = usePage<PageProps>().props;
    const confirm = useConfirm();

    const activate = (provider: WebhookConfig['provider']) => {
        router.post(
            route('webhook-configs.store', [workspace!.slug, application.slug, target.uuid]),
            { provider },
            { preserveScroll: true },
        );
    };

    const removeWebhook = (webhook: WebhookConfig) => {
        const label = PROVIDERS.find((p) => p.value === webhook.provider)?.label ?? webhook.provider;
        confirm.confirm({
            title: t('webhooksPanel.confirmRemove.title', { provider: label }),
            okType: 'danger',
            okText: t('webhooksPanel.confirmRemove.okText'),
            cancelText: t('webhooksPanel.confirmRemove.cancelText'),
            onOk: () =>
                router.delete(route('webhook-configs.destroy', [workspace!.slug, application.slug, webhook.uuid]), {
                    preserveScroll: true,
                }),
        });
    };

    const activeWebhook = target.webhook_configs.find((w) => w.enabled);
    const lockedProvider = target.repository_provider ?? null;

    return (
        <div className="webhook-list">
            <div className="webhook-list__hint">
                {t('webhooksPanel.hint')}
            </div>

            {PROVIDERS.map((provider) => {
                const webhook = target.webhook_configs.find((w) => w.provider === provider.value);
                const isActive = webhook?.enabled ?? false;
                // Locked = un autre provider possède le dépôt connecté
                const isLocked = !!lockedProvider && lockedProvider !== provider.value;
                const isAllowed = !lockedProvider || lockedProvider === provider.value;

                return (
                    <div key={provider.value} className={`webhook-row ${isActive ? 'webhook-row--active' : ''} ${isLocked ? 'webhook-row--locked' : ''}`}>
                        <div className="webhook-row__main">
                            <ProviderLogo provider={provider.value} />
                            <span className="webhook-row__provider">{provider.label}</span>

                            {isLocked ? (
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    {t('webhooksPanel.lockedByOtherProvider', {
                                        provider: PROVIDERS.find((p) => p.value === lockedProvider)?.label ?? lockedProvider,
                                    })}
                                </Text>
                            ) : webhook ? (
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    {target.repository ?? ''}
                                </Text>
                            ) : (
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    {t('webhooksPanel.notConfigured')}
                                </Text>
                            )}

                            <div style={{ flex: 1 }} />

                            {isActive ? (
                                <Tag color="green" icon={<CheckCircle2 size={12} />}>
                                    {t('webhooksPanel.active')}
                                </Tag>
                            ) : (
                                <Tag>{t('webhooksPanel.available')}</Tag>
                            )}

                            {canManage && !isActive && (
                                <Tooltip title={isLocked ? t('webhooksPanel.lockedTooltip') : undefined}>
                                    <Button
                                        size="small"
                                        type="primary"
                                        disabled={isLocked || !isAllowed}
                                        onClick={() => !isLocked && activate(provider.value)}
                                    >
                                        {t('webhooksPanel.activate')}
                                    </Button>
                                </Tooltip>
                            )}

                            {canManage && webhook && isAllowed && (
                                <a onClick={() => removeWebhook(webhook)} title={t('webhooksPanel.deleteTitle')}>
                                    <Trash2 size={14} />
                                </a>
                            )}
                        </div>

                        {isActive && webhook && (
                            <div className="webhook-row__detail">
                                {canManage ? (
                                    <WebhookUrlReveal application={application} webhook={webhook} />
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            {t('webhooksPanel.urlLabel')}
                                        </Text>
                                        <Text code copyable style={{ fontSize: 12 }}>
                                            {route('webhooks.receive', [webhook.provider, webhook.uuid])}
                                        </Text>
                                    </div>
                                )}

                                <div style={{ marginTop: 8 }}>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        {t('webhooksPanel.branchAutoMappingHint')}
                                    </Text>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}

            {!activeWebhook && (
                <div className="webhook-list__hint" style={{ marginTop: 4 }}>
                    {t('webhooksPanel.activateHint')}
                </div>
            )}
        </div>
    );
}
