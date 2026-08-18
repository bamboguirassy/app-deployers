import { useConfirm } from '@/theme/ConfirmContext';
import { PageProps } from '@/types';
import { Application, Target } from '@/types/models';
import { router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { Button, Select, Tag, Tooltip } from 'antd';
import { CheckCircle2, Unlink } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

type Provider = 'github' | 'gitlab' | 'bitbucket';

const PROVIDERS: { value: Provider; label: string; oauthAvailable: boolean }[] = [
    { value: 'github',    label: 'GitHub',    oauthAvailable: true  },
    { value: 'gitlab',    label: 'GitLab',    oauthAvailable: false },
    { value: 'bitbucket', label: 'Bitbucket', oauthAvailable: false },
];

export default function GitRepositorySection({
    application,
    target,
    canManage,
}: {
    application: Application;
    target: Target;
    canManage: boolean;
}) {
    const { t } = useTranslation('applications');
    const { workspace, gitConnections, gitProvidersConfigured } = usePage<PageProps>().props;
    const confirm = useConfirm();

    const githubConnection = gitConnections?.find((c) => c.provider === 'github');

    const [repos, setRepos] = useState<{ full_name: string }[] | null>(null);
    const [loadingRepos, setLoadingRepos] = useState(false);
    const [selectedRepo, setSelectedRepo] = useState<string | undefined>(undefined);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!githubConnection) return;
        setLoadingRepos(true);
        axios
            .get(route('git-connections.repositories', [workspace!.slug, githubConnection.id]))
            .then((res) => setRepos(Array.isArray(res.data.repositories) ? res.data.repositories : []))
            .catch(() => setRepos(null))
            .finally(() => setLoadingRepos(false));
    }, [githubConnection?.id]);

    const connect = (provider: Provider, repository: string) => {
        setSaving(true);
        router.patch(
            route('targets.update', [workspace!.slug, application.slug, target.uuid]),
            { repository, repository_provider: provider },
            { preserveScroll: true, onFinish: () => setSaving(false) },
        );
    };

    const disconnect = () => {
        confirm.confirm({
            title: t('gitRepository.confirmDisconnect.title'),
            content: t('gitRepository.confirmDisconnect.content'),
            okType: 'danger',
            okText: t('gitRepository.confirmDisconnect.okText'),
            cancelText: t('gitRepository.confirmDisconnect.cancelText'),
            onOk: () =>
                router.patch(
                    route('targets.update', [workspace!.slug, application.slug, target.uuid]),
                    { repository: null, repository_provider: null },
                    { preserveScroll: true },
                ),
        });
    };

    // ── État connecté ──────────────────────────────────────────────────────
    if (target.repository && target.repository_provider) {
        return (
            <div className="git-repo-connected">
                <span className="git-repo-connected__name">{target.repository}</span>
                {canManage && (
                    <Tooltip title={t('gitRepository.disconnect')}>
                        <button
                            type="button"
                            className="git-repo-connected__unlink"
                            aria-label={t('gitRepository.disconnect')}
                            onClick={disconnect}
                        >
                            <Unlink size={14} />
                        </button>
                    </Tooltip>
                )}
            </div>
        );
    }

    // ── État vide : liste des providers ────────────────────────────────────
    return (
        <div className="git-provider-list">
            {PROVIDERS.map((p) => {
                // GitHub — OAuth disponible
                if (p.value === 'github') {
                    if (githubConnection) {
                        // Connecté : afficher le sélecteur de dépôt
                        return (
                            <div key="github" className="git-provider-row git-provider-row--active">
                                <div className="git-provider-row__header">
                                    <span className="git-provider-row__label">
                                        GitHub — {githubConnection.account_login}
                                    </span>
                                    <Tag color="green" style={{ margin: 0, flexShrink: 0 }}>
                                        <CheckCircle2 size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                                        {t('gitRepository.connected')}
                                    </Tag>
                                </div>
                                <div className="git-provider-row__input-row">
                                    <Select
                                        size="small"
                                        showSearch
                                        loading={loadingRepos}
                                        placeholder={t('gitRepository.selectRepoPlaceholder')}
                                        value={selectedRepo}
                                        onChange={setSelectedRepo}
                                        options={(repos ?? []).map((r) => ({ value: r.full_name, label: r.full_name }))}
                                        filterOption={(input, opt) =>
                                            (opt?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
                                        }
                                        style={{ flex: 1, minWidth: 0 }}
                                        disabled={!canManage}
                                    />
                                    <Button
                                        size="small"
                                        type="primary"
                                        disabled={!selectedRepo || saving || !canManage}
                                        onClick={() => selectedRepo && connect('github', selectedRepo)}
                                    >
                                        {t('gitRepository.connect')}
                                    </Button>
                                </div>
                            </div>
                        );
                    }

                    // Non connecté : bouton OAuth
                    return (
                        <div key="github" className="git-provider-row">
                            <div className="git-provider-row__header">
                                <span className="git-provider-row__label">GitHub</span>
                                {canManage && (
                                    gitProvidersConfigured?.github ? (
                                        <a href={route('git-connections.redirect', [workspace!.slug, 'github'])}>
                                            <Button size="small" type="primary">
                                                {t('gitRepository.connectGithub')}
                                            </Button>
                                        </a>
                                    ) : (
                                        <Tooltip title={t('gitRepository.githubNotConfigured')}>
                                            <Button size="small" disabled>
                                                {t('gitRepository.connectGithub')}
                                            </Button>
                                        </Tooltip>
                                    )
                                )}
                            </div>
                        </div>
                    );
                }

                // GitLab / Bitbucket — OAuth non disponible
                return (
                    <div key={p.value} className="git-provider-row git-provider-row--disabled">
                        <div className="git-provider-row__header">
                            <span className="git-provider-row__label">{p.label}</span>
                            <Tag style={{ margin: 0, flexShrink: 0 }}>{t('gitRepository.comingSoon')}</Tag>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
