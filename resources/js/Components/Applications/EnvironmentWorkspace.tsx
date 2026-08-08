import CreateTargetModal from '@/Components/Applications/CreateTargetModal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import VariablesEditor from '@/Components/Applications/VariablesEditor';
import DirectoryBrowserModal from '@/Components/Servers/DirectoryBrowserModal';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import { useConfirm } from '@/theme/ConfirmContext';
import { PageProps } from '@/types';
import { Application, Environment, Framework, Server, Target, TargetEnvironmentLink } from '@/types/models';
import { router, useForm, usePage } from '@inertiajs/react';
import { Avatar, Drawer, Dropdown, Empty, Input, Modal, Select } from 'antd';
import { CheckCircle2, FolderSearch, Layers, MoreHorizontal, Plus, RefreshCcw, Rocket, Trash2 } from 'lucide-react';
import { FormEventHandler, Fragment, useState } from 'react';

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
    const link = target.target_environments.find((te) => te.environment_id === environment.id);

    if (!link) {
        return (
            <button type="button" className={`env-cell env-cell--empty ${selected ? 'env-cell--selected' : ''}`} onClick={onOpen}>
                <span className="env-cell__dot env-cell__dot--muted" />
                Non configuré
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
            <div className="env-cell__meta">
                {link.server ? link.server.name : 'Aucun serveur'} · {link.variables.length} vars
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
}: {
    application: Application;
    target: Target;
    environment: Environment;
    servers: Server[];
    canManage: boolean;
    canDeploy: boolean;
    onClose: () => void;
}) {
    const { workspace } = usePage<PageProps>().props;
    const existing = target.target_environments.find((te) => te.environment_id === environment.id);
    const [browsing, setBrowsing] = useState(false);

    const { data, setData, post, patch, processing, errors } = useForm({
        server_id: existing?.server_id ?? (null as number | null),
        deploy_path: existing?.deploy_path ?? '',
        git_branch: existing?.git_branch ?? 'main',
    });

    const selectedServer = servers.find((s) => s.id === data.server_id) ?? null;

    const save = () => {
        if (existing) {
            patch(route('target-environments.update', [workspace!.slug, application.slug, existing.id]), { preserveScroll: true });
        } else {
            post(route('target-environments.store', [workspace!.slug, application.slug, target.id, environment.id]), { preserveScroll: true });
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
            width={420}
            title={
                <div>
                    <div className="drawer-title-row">
                        <strong>
                            {target.name} • {environment.name}
                        </strong>
                        <span className={`drawer-status ${existing ? 'drawer-status--configured' : 'drawer-status--empty'}`}>
                            {existing && <CheckCircle2 size={12} />}
                            {existing ? 'Configured' : 'Non configuré'}
                        </span>
                    </div>
                    <div className="drawer-tags-row">
                        <span className="drawer-tag">{target.framework?.name ?? 'Stack personnalisée'}</span>
                        <span className="drawer-tag">{environment.name}</span>
                    </div>
                </div>
            }
            extra={
                existing &&
                canDeploy && (
                    <PrimaryButton
                        size="small"
                        htmlType="button"
                        icon={<Rocket size={14} />}
                        onClick={() => router.post(route('deployments.store', [workspace!.slug, application.slug, existing.id]))}
                    >
                        Déployer
                    </PrimaryButton>
                )
            }
            footer={
                canManage && (
                    <div className="drawer-footer">
                        <SecondaryButton htmlType="button" onClick={onClose}>
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton htmlType="button" disabled={processing} onClick={save}>
                            Save changes
                        </PrimaryButton>
                    </div>
                )
            }
        >
            <h4 className="target-workspace__section-title" style={{ marginTop: 0 }}>
                Général
            </h4>
            <form onSubmit={onSubmit} className="form-stack">
                <div>
                    <InputLabel value="Serveur" />
                    <Select
                        className="w-full"
                        placeholder="Choisir un serveur du workspace"
                        value={data.server_id ?? undefined}
                        onChange={(value) => setData('server_id', value)}
                        disabled={!canManage}
                        status={errors.server_id ? 'error' : undefined}
                        options={servers.map((s) => ({ value: s.id, label: `${s.name} (${s.host})` }))}
                        notFoundContent={<Empty description="Aucun serveur. Ajoutez-en un dans l'espace Serveurs." />}
                    />
                    <InputError message={errors.server_id} />
                </div>
                <div>
                    <InputLabel value="Chemin de déploiement" />
                    <div style={{ display: 'flex', gap: 8 }}>
                        <Input
                            placeholder="/var/www/api"
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
                            Parcourir
                        </SecondaryButton>
                    </div>
                    {!selectedServer && (
                        <span className="section-hint">Choisissez d&apos;abord un serveur pour parcourir ses dossiers.</span>
                    )}
                    <InputError message={errors.deploy_path} />
                </div>
                <div>
                    <InputLabel value="Branche git" />
                    <Input
                        placeholder="main"
                        value={data.git_branch}
                        onChange={(e) => setData('git_branch', e.target.value)}
                        disabled={!canManage}
                        status={errors.git_branch ? 'error' : undefined}
                    />
                    <InputError message={errors.git_branch} />
                </div>
            </form>

            <DirectoryBrowserModal
                workspaceSlug={workspace!.slug}
                server={selectedServer}
                initialPath={data.deploy_path}
                open={browsing}
                onClose={() => setBrowsing(false)}
                onSelect={(path) => setData('deploy_path', path)}
            />

            {existing && (
                <>
                    <h4 className="target-workspace__section-title">Variables d&apos;environnement</h4>
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
    const { workspace } = usePage<PageProps>().props;
    const [creatingEnv, setCreatingEnv] = useState(false);
    const [creatingTarget, setCreatingTarget] = useState(false);
    const [cell, setCell] = useState<{ target: Target; environment: Environment } | null>(null);
    const confirm = useConfirm();
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
            title: `Supprimer l'environnement "${environment.name}" ?`,
            okType: 'danger',
            okText: 'Supprimer',
            cancelText: 'Annuler',
            onOk: () => router.delete(route('environments.destroy', [workspace!.slug, application.slug, environment.id])),
        });
    };

    if (application.targets.length === 0) {
        return <Empty description="Créez d'abord au moins un target dans l'onglet Targets & Pipeline." />;
    }

    return (
        <div className="env-matrix-wrapper">
            <div className="env-matrix-toolbar">
                <div className="env-matrix-heading">
                    <h3>Matrice des environnements</h3>
                    <p>Gérez et comparez la configuration de vos targets à travers les environnements.</p>
                </div>

                <div className="env-matrix-toolbar-actions">
                    {canManage && (
                        <PrimaryButton size="small" icon={<Plus size={14} />} onClick={() => setCreatingEnv(true)}>
                            Ajouter un environnement
                        </PrimaryButton>
                    )}
                    {canManage && (
                        <SecondaryButton size="small" icon={<Plus size={14} />} onClick={() => setCreatingTarget(true)}>
                            Ajouter un target
                        </SecondaryButton>
                    )}
                    <Dropdown
                        menu={{
                            items: [
                                {
                                    key: 'refresh',
                                    label: 'Actualiser',
                                    icon: <RefreshCcw size={14} />,
                                    onClick: () => router.reload(),
                                },
                            ],
                        }}
                        trigger={['click']}
                    >
                        <button type="button" className="env-matrix-overflow-btn" aria-label="Plus d'actions">
                            <MoreHorizontal size={16} />
                        </button>
                    </Dropdown>
                </div>
            </div>

            <div className="env-matrix-legend">
                <span>
                    <span className="env-cell__dot env-cell__dot--ok" /> Configuré
                </span>
                <span>
                    <span className="env-cell__dot env-cell__dot--muted" /> Non configuré
                </span>
                <span>
                    <span className="env-cell__dot env-cell__dot--secret" /> Contient des secrets
                </span>
            </div>

            {application.environments.length === 0 ? (
                <Empty description="Aucun environnement. Ajoutez par exemple « develop » et « production »." />
            ) : (
                <div className="env-matrix">
                    <div className="env-matrix__table" style={{ gridTemplateColumns: `220px repeat(${application.environments.length}, 1fr)` }}>
                        <div className="env-matrix__header env-matrix__corner">Targets</div>
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
                                        <small>{target.framework?.name ?? 'Personnalisé'}</small>
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
                    servers={servers}
                    canManage={canManage}
                    canDeploy={canDeploy}
                    onClose={() => setCell(null)}
                />
            )}

            <CreateTargetModal
                application={application}
                frameworks={frameworks}
                open={creatingTarget}
                onClose={() => setCreatingTarget(false)}
                onCreated={() => undefined}
            />

            <Modal title="Nouvel environnement" open={creatingEnv} onCancel={() => setCreatingEnv(false)} footer={null} destroyOnClose>
                <form onSubmit={submit} className="form-stack">
                    <Input
                        placeholder="ex: develop, staging, production..."
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        autoFocus
                    />
                    {errors.name && <div className="field-error">{errors.name}</div>}
                    <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
                        <PrimaryButton disabled={processing}>Créer</PrimaryButton>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
