import CreateTargetModal from '@/Components/Applications/CreateTargetModal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import VariablesEditor from '@/Components/Applications/VariablesEditor';
import DirectoryBrowserModal from '@/Components/Servers/DirectoryBrowserModal';
import ServerFormModal from '@/Components/Servers/ServerFormModal';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import { useConfirm } from '@/theme/ConfirmContext';
import { PageProps } from '@/types';
import { Application, Environment, Framework, Server, Target, TargetEnvironmentLink } from '@/types/models';
import { GitConnection } from '@/types';
import { router, useForm, usePage } from '@inertiajs/react';
import { Avatar, Drawer, Dropdown, Empty, Input, Modal, Select, Tag, Typography } from 'antd';
import axios from 'axios';
import { CheckCircle2, ExternalLink, FolderSearch, GitBranch, Layers, MoreHorizontal, Plus, RefreshCcw, Rocket, Trash2 } from 'lucide-react';
import { FormEventHandler, Fragment, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

function EnvironmentCell({
    target,
    environment,
    selected,
    onOpen,
}: {
    target: Target;
    environment: Environment;
    selected: boolean;
    onOpen: () => void;
}) {
    const { t } = useTranslation('applications');
    const link = target.target_environments.find((te) => te.environment_id === environment.id);

    if (!link) {
        return (
            <button type="button" className={`env-cell env-cell--empty ${selected ? 'env-cell--selected' : ''}`} onClick={onOpen}>
                <span className="env-cell__dot env-cell__dot--muted" />
                {t('environmentWorkspace.notConfigured')}
            </button>
        );
    }

    const hasSecrets = link.variables.some((v) => v.is_secret);

    return (
        <button type="button" className={`env-cell ${selected ? 'env-cell--selected' : ''}`} onClick={onOpen}>
            <div className="env-cell__row">
                <span className="env-cell__dot env-cell__dot--ok" />
                <span className="env-cell__branch">{link.git_branch}</span>
                {hasSecrets && <span className="env-cell__dot env-cell__dot--secret" />}
            </div>
            <div className="env-cell__path">{link.deploy_path}</div>
            {link.url && (
                <span
                    role="link"
                    tabIndex={0}
                    className="env-cell__url-row"
                    aria-label={t('environmentWorkspace.openUrlAriaLabel')}
                    onClick={(e) => {
                        e.stopPropagation();
                        window.open(link.url!, '_blank', 'noopener,noreferrer');
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.stopPropagation();
                            window.open(link.url!, '_blank', 'noopener,noreferrer');
                        }
                    }}
                >
                    <ExternalLink size={10} className="env-cell__url-icon" />
                    <span className="env-cell__url-text">{link.url}</span>
                </span>
            )}
            <div className="env-cell__meta">
                {link.server ? link.server.name : t('environmentWorkspace.noServer')} · {link.variables.length} {t('environmentWorkspace.varsUnit')}
                <span>›</span>
            </div>
        </button>
    );
}

function ConfigDrawer({
    application,
    target,
    environment,
    servers,
    canManage,
    canDeploy,
    onClose,
    onServerCreated,
}: {
    application: Application;
    target: Target;
    environment: Environment;
    servers: Server[];
    canManage: boolean;
    canDeploy: boolean;
    onClose: () => void;
    onServerCreated?: (server: Server) => void;
}) {
    const { t } = useTranslation('applications');
    const { workspace, gitConnections } = usePage<PageProps>().props;
    const existing = target.target_environments.find((te) => te.environment_id === environment.id);
    const [browsing, setBrowsing] = useState(false);
    const [addingServer, setAddingServer] = useState(false);

    const linkedRepository = target.repository ?? null;
    const githubConnection: GitConnection | undefined = gitConnections.find((c) => c.provider === 'github');

    const [remoteBranches, setRemoteBranches] = useState<string[] | null>(null);
    const [loadingBranches, setLoadingBranches] = useState(false);

    useEffect(() => {
        if (!linkedRepository || !githubConnection) return;

        setLoadingBranches(true);
        axios
            .get(route('git-connections.branches', [workspace!.slug, githubConnection.id]), {
                params: { repository: linkedRepository },
            })
            .then((res) => {
                if (Array.isArray(res.data.branches)) {
                    setRemoteBranches(res.data.branches);
                }
            })
            .catch(() => setRemoteBranches(null))
            .finally(() => setLoadingBranches(false));
    }, [linkedRepository, githubConnection?.id]);

    const { data, setData, post, patch, processing, errors } = useForm({
        server_id: existing?.server_id ?? (null as number | null),
        deploy_path: existing?.deploy_path ?? '',
        git_branch: existing?.git_branch ?? 'main',
        url: existing?.url ?? '',
    });

    const selectedServer = servers.find((s) => s.id === data.server_id) ?? null;

    const save = () => {
        if (existing) {
            patch(route('target-environments.update', [workspace!.slug, application.slug, existing.uuid]), {
                preserveScroll: true,
                preserveState: true,
            });
        } else {
            post(route('target-environments.store', [workspace!.slug, application.slug, target.uuid, environment.uuid]), {
                preserveScroll: true,
                preserveState: true,
            });
        }
    };

    const handleServerChange = (value: number) => {
        const server = servers.find((s) => s.id === value);

        setData('server_id', value);

        if (!data.deploy_path && server?.default_path) {
            setData('deploy_path', server.default_path);
        }
    };

    const handleServerCreatedInDrawer = (newServer: Server) => {
        onServerCreated?.(newServer);
        setData('server_id', newServer.id);
        if (!data.deploy_path && newServer.default_path) {
            setData('deploy_path', newServer.default_path);
        }
    };

    const onSubmit: FormEventHandler = (e) => {
        e.preventDefault();
        save();
    };

    return (
        <Drawer
            open
            onClose={onClose}
            width="min(420px, 92vw)"
            title={
                <div className="drawer-header">
                    <div className="drawer-title-row">
                        <div className="drawer-title-row__text">
                            <strong>{target.name} • {environment.name}</strong>
                            <div className="drawer-tags-row">
                                <span className="drawer-tag">{target.framework?.name ?? t('environmentWorkspace.drawer.customStack')}</span>
                                <span className="drawer-tag">{environment.name}</span>
                            </div>
                        </div>
                        <div className="drawer-title-row__actions">
                            <span className={`drawer-status ${existing ? 'drawer-status--configured' : 'drawer-status--empty'}`}>
                                {existing && <CheckCircle2 size={12} />}
                                {existing ? t('environmentWorkspace.configured') : t('environmentWorkspace.notConfigured')}
                            </span>
                            {existing && canDeploy && (
                                <PrimaryButton
                                    size="small"
                                    htmlType="button"
                                    icon={<Rocket size={14} />}
                                    onClick={() => router.post(route('deployments.store', [workspace!.slug, application.slug, existing.uuid]))}
                                >
                                    {t('environmentWorkspace.drawer.deploy')}
                                </PrimaryButton>
                            )}
                        </div>
                    </div>
                </div>
            }
            footer={
                canManage && (
                    <div className="drawer-footer">
                        <SecondaryButton htmlType="button" onClick={onClose}>
                            {t('environmentWorkspace.drawer.cancel')}
                        </SecondaryButton>
                        <PrimaryButton htmlType="button" disabled={processing} onClick={save}>
                            {t('environmentWorkspace.drawer.save')}
                        </PrimaryButton>
                    </div>
                )
            }
        >
            <h4 className="target-workspace__section-title" style={{ marginTop: 0 }}>
                {t('environmentWorkspace.drawer.generalSectionTitle')}
            </h4>
            <form onSubmit={onSubmit} className="form-stack">
                <div>
                    <InputLabel value={t('environmentWorkspace.drawer.serverLabel')} />
                    <div style={{ display: 'flex', gap: 8 }}>
                        <Select
                            className="w-full"
                            placeholder={t('environmentWorkspace.drawer.serverPlaceholder')}
                            value={data.server_id ?? undefined}
                            onChange={handleServerChange}
                            disabled={!canManage}
                            status={errors.server_id ? 'error' : undefined}
                            options={servers.map((s) => ({ value: s.id, label: `${s.name} (${s.host})` }))}
                            notFoundContent={<Empty description={t('environmentWorkspace.drawer.noServerHint')} />}
                        />
                        {canManage && (
                            <SecondaryButton
                                htmlType="button"
                                icon={<Plus size={14} />}
                                onClick={() => setAddingServer(true)}
                                aria-label={t('environmentWorkspace.drawer.addServer')}
                                title={t('environmentWorkspace.drawer.addServer')}
                            />
                        )}
                    </div>
                    <InputError message={errors.server_id} />
                </div>
                <div>
                    <InputLabel value={t('environmentWorkspace.drawer.deployPathLabel')} />
                    <div style={{ display: 'flex', gap: 8 }}>
                        <Input
                            placeholder={t('environmentWorkspace.drawer.deployPathPlaceholder')}
                            value={data.deploy_path}
                            readOnly
                            status={errors.deploy_path ? 'error' : undefined}
                        />
                        <SecondaryButton
                            htmlType="button"
                            icon={<FolderSearch size={14} />}
                            onClick={() => setBrowsing(true)}
                            disabled={!canManage || !selectedServer}
                        >
                            {t('environmentWorkspace.drawer.browse')}
                        </SecondaryButton>
                    </div>
                    {!selectedServer && (
                        <span className="section-hint">{t('environmentWorkspace.drawer.chooseServerHint')}</span>
                    )}
                    <InputError message={errors.deploy_path} />
                </div>
                <div>
                    <InputLabel value={t('environmentWorkspace.drawer.branchLabel')} />
                    {Array.isArray(remoteBranches) ? (
                        <Select
                            className="w-full"
                            showSearch
                            loading={loadingBranches}
                            placeholder={t('environmentWorkspace.drawer.branchPlaceholder')}
                            value={data.git_branch || undefined}
                            onChange={(value) => setData('git_branch', value)}
                            disabled={!canManage}
                            status={errors.git_branch ? 'error' : undefined}
                            options={remoteBranches.map((b) => ({ value: b, label: b }))}
                            filterOption={(input, option) =>
                                (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                        />
                    ) : (
                        <Input
                            placeholder={t('environmentWorkspace.drawer.branchPlaceholder')}
                            value={data.git_branch}
                            onChange={(e) => setData('git_branch', e.target.value)}
                            disabled={!canManage || loadingBranches}
                            status={errors.git_branch ? 'error' : undefined}
                            suffix={loadingBranches ? <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>…</span> : null}
                        />
                    )}
                    <InputError message={errors.git_branch} />
                    {linkedRepository && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                            <GitBranch size={11} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                            <Text type="secondary" style={{ fontSize: 11 }}>
                                {linkedRepository} — {t('environmentWorkspace.drawer.repositoryReadOnly')}
                            </Text>
                        </div>
                    )}
                </div>
                <div>
                    <InputLabel value={t('environmentWorkspace.drawer.urlLabel')} />
                    <div style={{ display: 'flex', gap: 8 }}>
                        <Input
                            placeholder={t('environmentWorkspace.drawer.urlPlaceholder')}
                            value={data.url}
                            onChange={(e) => setData('url', e.target.value)}
                            disabled={!canManage}
                            status={errors.url ? 'error' : undefined}
                        />
                        {data.url && (
                            <SecondaryButton
                                htmlType="button"
                                icon={<ExternalLink size={14} />}
                                onClick={() => window.open(data.url, '_blank', 'noopener,noreferrer')}
                            >
                                {t('environmentWorkspace.drawer.openUrl')}
                            </SecondaryButton>
                        )}
                    </div>
                    <InputError message={errors.url} />
                </div>
            </form>

            <ServerFormModal
                workspaceSlug={workspace!.slug}
                open={addingServer}
                onClose={() => setAddingServer(false)}
                onServerCreated={handleServerCreatedInDrawer}
            />

            <DirectoryBrowserModal
                workspaceSlug={workspace!.slug}
                server={selectedServer}
                initialPath={data.deploy_path || selectedServer?.default_path || '/'}
                open={browsing}
                onClose={() => setBrowsing(false)}
                onSelect={(path) => setData('deploy_path', path)}
            />

            {existing && (
                <>
                    <h4 className="target-workspace__section-title">{t('environmentWorkspace.drawer.variablesSectionTitle')}</h4>
                    <VariablesEditor application={application} targetEnvironment={existing as TargetEnvironmentLink} canManage={canManage} />
                </>
            )}
        </Drawer>
    );
}

export default function EnvironmentWorkspace({
    application,
    frameworks,
    servers,
    canManage,
    canDeploy,
}: {
    application: Application;
    frameworks: Framework[];
    servers: Server[];
    canManage: boolean;
    canDeploy: boolean;
}) {
    const { t } = useTranslation('applications');
    const { workspace } = usePage<PageProps>().props;
    const [creatingEnv, setCreatingEnv] = useState(false);
    const [creatingTarget, setCreatingTarget] = useState(false);
    const [cell, setCell] = useState<{ target: Target; environment: Environment } | null>(null);
    const [localServers, setLocalServers] = useState<Server[]>(servers);
    const confirm = useConfirm();

    const handleServerCreated = (newServer: Server) => {
        setLocalServers((prev) => [...prev, newServer]);
    };
    const { data, setData, post, processing, reset, errors } = useForm({ name: '' });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('environments.store', [workspace!.slug, application.slug]), {
            onSuccess: () => {
                reset();
                setCreatingEnv(false);
            },
        });
    };

    const removeEnvironment = (environment: Environment) => {
        confirm.confirm({
            title: t('environmentWorkspace.confirmRemoveEnvironment.title', { name: environment.name }),
            okType: 'danger',
            okText: t('environmentWorkspace.confirmRemoveEnvironment.okText'),
            cancelText: t('environmentWorkspace.confirmRemoveEnvironment.cancelText'),
            onOk: () => router.delete(route('environments.destroy', [workspace!.slug, application.slug, environment.uuid])),
        });
    };

    if (application.targets.length === 0) {
        return <Empty description={t('environmentWorkspace.emptyNoTargets')} />;
    }

    return (
        <div className="env-matrix-wrapper">
            <div className="env-matrix-toolbar">
                <div className="env-matrix-heading">
                    <h3>{t('environmentWorkspace.heading')}</h3>
                    <p>{t('environmentWorkspace.subheading')}</p>
                </div>

                <div className="env-matrix-toolbar-actions">
                    {canManage && (
                        <PrimaryButton size="small" icon={<Plus size={14} />} onClick={() => setCreatingEnv(true)}>
                            {t('environmentWorkspace.addEnvironment')}
                        </PrimaryButton>
                    )}
                    {canManage && (
                        <SecondaryButton size="small" icon={<Plus size={14} />} onClick={() => setCreatingTarget(true)}>
                            {t('environmentWorkspace.addTarget')}
                        </SecondaryButton>
                    )}
                    <Dropdown
                        menu={{
                            items: [
                                {
                                    key: 'refresh',
                                    label: t('environmentWorkspace.refresh'),
                                    icon: <RefreshCcw size={14} />,
                                    onClick: () => router.reload(),
                                },
                            ],
                        }}
                        trigger={['click']}
                    >
                        <button type="button" className="env-matrix-overflow-btn" aria-label={t('environmentWorkspace.moreActionsAriaLabel')}>
                            <MoreHorizontal size={16} />
                        </button>
                    </Dropdown>
                </div>
            </div>

            <div className="env-matrix-legend">
                <span>
                    <span className="env-cell__dot env-cell__dot--ok" /> {t('environmentWorkspace.legend.configured')}
                </span>
                <span>
                    <span className="env-cell__dot env-cell__dot--muted" /> {t('environmentWorkspace.legend.notConfigured')}
                </span>
                <span>
                    <span className="env-cell__dot env-cell__dot--secret" /> {t('environmentWorkspace.legend.hasSecrets')}
                </span>
            </div>

            {application.environments.length === 0 ? (
                <Empty description={t('environmentWorkspace.emptyNoEnvironments')} />
            ) : (
                <div className="env-matrix">
                    <div className="env-matrix__table" style={{ gridTemplateColumns: `220px repeat(${application.environments.length}, 1fr)` }}>
                        <div className="env-matrix__header env-matrix__corner">{t('environmentWorkspace.targetsColumnHeader')}</div>
                        {application.environments.map((environment) => (
                            <div key={environment.id} className="env-matrix__header">
                                <span>{environment.name}</span>
                                {canManage && (
                                    <a onClick={() => removeEnvironment(environment)}>
                                        <Trash2 size={12} />
                                    </a>
                                )}
                            </div>
                        ))}

                        {application.targets.map((target) => (
                            <Fragment key={target.id}>
                                <div className="env-matrix__row-label">
                                    <Avatar
                                        size={24}
                                        src={target.framework?.logo_url ?? undefined}
                                        icon={!target.framework?.logo_url && <Layers size={12} />}
                                        shape="square"
                                    />
                                    <div>
                                        <strong>{target.name}</strong>
                                        <small>{target.framework?.name ?? t('environmentWorkspace.customFramework')}</small>
                                    </div>
                                </div>

                                {application.environments.map((environment) => {
                                    const isSelected = cell?.target.id === target.id && cell?.environment.id === environment.id;
                                    return (
                                        <div
                                            key={`${target.id}-${environment.id}`}
                                            className={`env-matrix__cell ${isSelected ? 'env-matrix__cell--selected' : ''}`}
                                        >
                                            <EnvironmentCell
                                                target={target}
                                                environment={environment}
                                                selected={isSelected}
                                                onOpen={() => setCell({ target, environment })}
                                            />
                                        </div>
                                    );
                                })}
                            </Fragment>
                        ))}
                    </div>
                </div>
            )}

            {cell && (
                <ConfigDrawer
                    application={application}
                    target={application.targets.find((t) => t.id === cell.target.id) ?? cell.target}
                    environment={cell.environment}
                    servers={localServers}
                    canManage={canManage}
                    canDeploy={canDeploy}
                    onClose={() => setCell(null)}
                    onServerCreated={handleServerCreated}
                />
            )}

            <CreateTargetModal
                application={application}
                frameworks={frameworks}
                open={creatingTarget}
                onClose={() => setCreatingTarget(false)}
                onCreated={() => undefined}
            />

            <Modal title={t('environmentWorkspace.newEnvironmentModalTitle')} open={creatingEnv} onCancel={() => setCreatingEnv(false)} footer={null} destroyOnClose>
                <form onSubmit={submit} className="form-stack">
                    <Input
                        placeholder={t('environmentWorkspace.newEnvironmentPlaceholder')}
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        autoFocus
                    />
                    {errors.name && <div className="field-error">{errors.name}</div>}
                    <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
                        <PrimaryButton disabled={processing}>{t('environmentWorkspace.create')}</PrimaryButton>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
