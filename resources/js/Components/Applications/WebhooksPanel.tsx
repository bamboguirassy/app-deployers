import ProviderLogo from '@/Components/Applications/ProviderLogo';
import { useConfirm } from '@/theme/ConfirmContext';
import { PageProps } from '@/types';
import { Application, Environment, Target, WebhookConfig } from '@/types/models';
import { router, useForm, usePage } from '@inertiajs/react';
import axios from 'axios';
import { CheckCircle2, Eye, EyeOff, Trash2 } from 'lucide-react';
import { Button, Input, Select, Tag, Typography } from 'antd';
import { FormEventHandler, useState } from 'react';

const { Text } = Typography;

function WebhookUrlReveal({ application, webhook }: { application: Application; webhook: WebhookConfig }) {
    const { workspace } = usePage<PageProps>().props;
    const [revealed, setRevealed] = useState<{ secret: string; url: string } | null>(null);
    const [loading, setLoading] = useState(false);

    const reveal = () => {
        setLoading(true);
        axios
            .post(route('webhook-configs.reveal-secret', [workspace!.slug, application.slug, webhook.id]))
            .then((res) => setRevealed(res.data))
            .finally(() => setLoading(false));
    };

    if (!revealed) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    URL :
                </Text>
                <Text code style={{ fontSize: 12 }}>
                    {route('webhooks.receive', [webhook.provider, webhook.id])}
                </Text>
                <Button size="small" type="text" icon={<Eye size={13} />} loading={loading} onClick={reveal}>
                    Afficher le secret
                </Button>
            </div>
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    URL :
                </Text>
                <Text code copyable style={{ fontSize: 12 }}>
                    {revealed.url}
                </Text>
                <Button size="small" type="text" icon={<EyeOff size={13} />} onClick={() => setRevealed(null)}>
                    Masquer
                </Button>
            </div>
            {webhook.provider !== 'bitbucket' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Secret à coller dans {webhook.provider === 'github' ? 'GitHub' : 'GitLab'} :
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

function BranchMappingForm({
    application,
    webhookConfig,
    environments,
}: {
    application: Application;
    webhookConfig: WebhookConfig;
    environments: Environment[];
}) {
    const { workspace } = usePage<PageProps>().props;
    const { data, setData, post, processing, reset } = useForm({
        environment_id: '' as number | '',
        branch: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(
            route('webhook-branch-mappings.store', [workspace!.slug, application.slug, webhookConfig.id]),
            { preserveScroll: true, onSuccess: () => reset() },
        );
    };

    const availableEnvironments = environments.filter(
        (env) => !webhookConfig.branch_mappings.some((m) => m.environment_id === env.id),
    );

    return (
        <form onSubmit={submit} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Select
                size="small"
                placeholder="Environnement"
                style={{ width: 140 }}
                value={data.environment_id || undefined}
                onChange={(value) => setData('environment_id', value)}
                options={availableEnvironments.map((env) => ({ value: env.id, label: env.name }))}
            />
            <Input
                size="small"
                placeholder="branche (ex: main)"
                value={data.branch}
                onChange={(e) => setData('branch', e.target.value)}
                style={{ width: 140 }}
            />
            <Button size="small" htmlType="submit" disabled={processing || !data.environment_id || !data.branch}>
                Mapper
            </Button>
        </form>
    );
}

export default function WebhooksPanel({
    application,
    target,
    environments,
    canManage,
}: {
    application: Application;
    target: Target;
    environments: Environment[];
    canManage: boolean;
}) {
    const { workspace } = usePage<PageProps>().props;
    const confirm = useConfirm();

    const activate = (provider: WebhookConfig['provider']) => {
        router.post(
            route('webhook-configs.store', [workspace!.slug, application.slug, target.id]),
            { provider },
            { preserveScroll: true },
        );
    };

    const removeWebhook = (webhook: WebhookConfig) => {
        const label = PROVIDERS.find((p) => p.value === webhook.provider)?.label ?? webhook.provider;
        confirm.confirm({
            title: `Supprimer l'intégration ${label} ?`,
            okType: 'danger',
            okText: 'Supprimer',
            cancelText: 'Annuler',
            onOk: () =>
                router.delete(route('webhook-configs.destroy', [workspace!.slug, application.slug, webhook.id]), {
                    preserveScroll: true,
                }),
        });
    };

    const activeWebhook = target.webhook_configs.find((w) => w.enabled);

    return (
        <div className="webhook-list">
            <div className="webhook-list__hint">
                Une seule intégration peut être active à la fois : activer un autre provider désactivera l&apos;actuel.
            </div>

            {PROVIDERS.map((provider) => {
                const webhook = target.webhook_configs.find((w) => w.provider === provider.value);
                const isActive = webhook?.enabled ?? false;

                return (
                    <div key={provider.value} className={`webhook-row ${isActive ? 'webhook-row--active' : ''}`}>
                        <div className="webhook-row__main">
                            <ProviderLogo provider={provider.value} />
                            <span className="webhook-row__provider">{provider.label}</span>

                            {webhook ? (
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    {webhook.branch_mappings.length > 0
                                        ? webhook.branch_mappings.map((m) => m.branch).join(', ')
                                        : 'Aucun mapping configuré'}
                                </Text>
                            ) : (
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    Non configuré
                                </Text>
                            )}

                            <div style={{ flex: 1 }} />

                            {isActive ? (
                                <Tag color="green" icon={<CheckCircle2 size={12} />}>
                                    Active
                                </Tag>
                            ) : (
                                <Tag>Disponible</Tag>
                            )}

                            {canManage && !isActive && (
                                <Button size="small" type="primary" onClick={() => activate(provider.value)}>
                                    Activer
                                </Button>
                            )}

                            {canManage && webhook && (
                                <a onClick={() => removeWebhook(webhook)} title="Supprimer">
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
                                            URL :
                                        </Text>
                                        <Text code copyable style={{ fontSize: 12 }}>
                                            {route('webhooks.receive', [webhook.provider, webhook.id])}
                                        </Text>
                                    </div>
                                )}

                                <div style={{ marginTop: 8 }}>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        Mapping de branches → environnement :
                                    </Text>
                                    <div style={{ marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                        {webhook.branch_mappings.map((mapping) => {
                                            const env = environments.find((e) => e.id === mapping.environment_id);
                                            return (
                                                <Tag
                                                    key={mapping.id}
                                                    closable={canManage}
                                                    onClose={() =>
                                                        router.delete(
                                                            route('webhook-branch-mappings.destroy', [
                                                                workspace!.slug,
                                                                application.slug,
                                                                webhook.id,
                                                                mapping.id,
                                                            ]),
                                                            { preserveScroll: true },
                                                        )
                                                    }
                                                >
                                                    {mapping.branch} → {env?.name ?? '?'}
                                                </Tag>
                                            );
                                        })}
                                    </div>
                                    {canManage && (
                                        <BranchMappingForm application={application} webhookConfig={webhook} environments={environments} />
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}

            {!activeWebhook && (
                <div className="webhook-list__hint" style={{ marginTop: 4 }}>
                    Activer un provider révèle son URL de webhook et permet de mapper des branches à des environnements.
                </div>
            )}
        </div>
    );
}
