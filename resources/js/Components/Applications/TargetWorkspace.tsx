import CreateTargetModal from '@/Components/Applications/CreateTargetModal';
import FrameworkSelect from '@/Components/Applications/FrameworkSelect';
import PipelineStepsPanel from '@/Components/Applications/PipelineStepsPanel';
import WebhooksPanel from '@/Components/Applications/WebhooksPanel';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import { useConfirm } from '@/theme/ConfirmContext';
import { PageProps } from '@/types';
import { Application, Framework, Target } from '@/types/models';
import { router, useForm, usePage } from '@inertiajs/react';
import { Avatar, Empty, Input, Modal } from 'antd';
import { Layers, Pencil, Plus, Trash2 } from 'lucide-react';
import { FormEventHandler, useEffect, useState } from 'react';

function TargetEditModal({
    application,
    target,
    frameworks,
    open,
    onClose,
}: {
    application: Application;
    target: Target;
    frameworks: Framework[];
    open: boolean;
    onClose: () => void;
}) {
    const { workspace } = usePage<PageProps>().props;
    const { data, setData, patch, processing, errors } = useForm({
        name: target.name,
        framework_id: target.framework_id,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        patch(route('targets.update', [workspace!.slug, application.slug, target.id]), { onSuccess: onClose });
    };

    return (
        <Modal title="Modifier le target" open={open} onCancel={onClose} footer={null} destroyOnClose>
            <form onSubmit={submit} className="form-stack">
                <div>
                    <InputLabel htmlFor={`framework-${target.id}`} value="Framework / stack" />
                    <FrameworkSelect
                        id={`framework-${target.id}`}
                        frameworks={frameworks}
                        value={data.framework_id}
                        onChange={(value) => setData('framework_id', value)}
                    />
                </div>

                <div>
                    <InputLabel htmlFor={`name-${target.id}`} value="Nom du target" />
                    <Input
                        id={`name-${target.id}`}
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        autoFocus
                    />
                    {errors.name && <div className="field-error">{errors.name}</div>}
                </div>

                <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
                    <PrimaryButton disabled={processing}>Enregistrer</PrimaryButton>
                </div>
            </form>
        </Modal>
    );
}

export default function TargetWorkspace({
    application,
    frameworks,
    canManage,
}: {
    application: Application;
    frameworks: Framework[];
    canManage: boolean;
}) {
    const { workspace } = usePage<PageProps>().props;
    const [selectedId, setSelectedId] = useState<number | null>(application.targets[0]?.id ?? null);
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState(false);
    const confirm = useConfirm();

    useEffect(() => {
        if (!application.targets.some((t) => t.id === selectedId)) {
            setSelectedId(application.targets[0]?.id ?? null);
        }
    }, [application.targets, selectedId]);

    const selected = application.targets.find((t) => t.id === selectedId) ?? null;

    const destroy = (target: Target) => {
        confirm.confirm({
            title: `Supprimer le target "${target.name}" ?`,
            content: 'Toutes ses étapes, environnements liés et webhooks seront supprimés.',
            okType: 'danger',
            okText: 'Supprimer',
            cancelText: 'Annuler',
            onOk: () => router.delete(route('targets.destroy', [workspace!.slug, application.slug, target.id])),
        });
    };

    if (application.targets.length === 0) {
        return (
            <div className="target-workspace target-workspace--empty">
                <Empty description="Aucun target. Ajoutez par exemple « Backend » et « Frontend ».">
                    {canManage && (
                        <PrimaryButton icon={<Plus size={14} />} onClick={() => setCreating(true)}>
                            Nouveau target
                        </PrimaryButton>
                    )}
                </Empty>
                <CreateTargetModal
                    application={application}
                    frameworks={frameworks}
                    open={creating}
                    onClose={() => setCreating(false)}
                    onCreated={setSelectedId}
                />
            </div>
        );
    }

    return (
        <div className="target-workspace">
            <aside className="target-workspace__sidebar">
                <div className="target-workspace__sidebar-header">
                    <span>Targets</span>
                    {canManage && (
                        <button type="button" className="target-workspace__add-btn" onClick={() => setCreating(true)}>
                            <Plus size={14} /> Ajouter
                        </button>
                    )}
                </div>

                <div className="target-workspace__list">
                    {application.targets.map((target) => (
                        <button
                            key={target.id}
                            type="button"
                            className={`target-workspace__item ${target.id === selectedId ? 'target-workspace__item--active' : ''}`}
                            onClick={() => setSelectedId(target.id)}
                        >
                            <Avatar
                                size={32}
                                src={target.framework?.logo_url ?? undefined}
                                icon={!target.framework?.logo_url && <Layers size={16} />}
                                shape="square"
                            />
                            <span className="target-workspace__item-text">
                                <strong>{target.name}</strong>
                                <small>{target.framework?.name ?? 'Personnalisé'}</small>
                            </span>
                            <span className="target-workspace__item-badge">{target.pipeline_steps.length} étapes</span>
                        </button>
                    ))}
                </div>
            </aside>

            <section className="target-workspace__detail">
                {selected && (
                    <>
                        <div className="target-workspace__detail-header">
                            <Avatar
                                size={40}
                                src={selected.framework?.logo_url ?? undefined}
                                icon={!selected.framework?.logo_url && <Layers size={18} />}
                                shape="square"
                            />
                            <div className="target-workspace__detail-title">
                                <h3>{selected.name}</h3>
                                <span>{selected.framework?.name ?? 'Stack personnalisée'}</span>
                            </div>

                            {canManage && (
                                <div className="target-workspace__detail-actions">
                                    <button type="button" onClick={() => setEditing(true)}>
                                        <Pencil size={14} /> Modifier
                                    </button>
                                    <button type="button" onClick={() => destroy(selected)}>
                                        <Trash2 size={14} /> Supprimer
                                    </button>
                                </div>
                            )}
                        </div>

                        <h4 className="target-workspace__section-title">Étapes du pipeline</h4>
                        <PipelineStepsPanel application={application} target={selected} canManage={canManage} />

                        <h4 className="target-workspace__section-title">Intégration webhook</h4>
                        <WebhooksPanel
                            application={application}
                            target={selected}
                            environments={application.environments}
                            canManage={canManage}
                        />

                        <TargetEditModal
                            application={application}
                            target={selected}
                            frameworks={frameworks}
                            open={editing}
                            onClose={() => setEditing(false)}
                        />
                    </>
                )}
            </section>

            <CreateTargetModal
                application={application}
                frameworks={frameworks}
                open={creating}
                onClose={() => setCreating(false)}
                onCreated={setSelectedId}
            />
        </div>
    );
}
