import { defaultConfigFor, getStepTypeOptions, stepSummary, stepTypeIcon } from '@/constants/stepTypes';
import { getTemplateVariables, interpolatePreview } from '@/constants/templateVariables';
import { useConfirm } from '@/theme/ConfirmContext';
import { PageProps } from '@/types';
import { Application, CommandStepConfig, EmailStepConfig, PipelineStep, StepType, Target } from '@/types/models';
import {
    DndContext,
    DragEndEvent,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    SortableContext,
    arrayMove,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { router, usePage } from '@inertiajs/react';
import type { InputRef } from 'antd/es/input';
import type { TextAreaRef } from 'antd/es/input/TextArea';
import {
    Alert,
    Button,
    Drawer,
    Dropdown,
    Empty,
    Input,
    InputNumber,
    Segmented,
    Select,
    Switch,
    Tooltip,
} from 'antd';
import { Eye, GripVertical, Pencil, Plus, Trash2, Variable } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const persistOptions = { preserveScroll: true, preserveState: true } as const;

type DraftConfig = Partial<CommandStepConfig & EmailStepConfig>;

function insertAtCursor(el: HTMLTextAreaElement | HTMLInputElement | null | undefined, current: string, insert: string): string {
    if (!el) return current + insert;
    const start = el.selectionStart ?? current.length;
    const end = el.selectionEnd ?? current.length;

    return current.slice(0, start) + insert + current.slice(end);
}

/**
 * Dérive un nom d'étape lisible à partir d'une commande shell : une seule
 * ligne, espaces normalisés, tronquée pour rester lisible dans la liste des
 * étapes (la colonne "Étape" est étroite) — le backend accepte jusqu'à 255
 * caractères mais un nom aussi long serait illisible.
 */
function deriveLabelFromCommand(command: string): string {
    const singleLine = command.trim().replace(/\s+/g, ' ');

    return singleLine.length > 60 ? `${singleLine.slice(0, 60)}…` : singleLine;
}

/** Petit menu "Insérer une variable" réutilisé pour l'objet et le corps du mail. */
function VariableInsertButton({ onInsert }: { onInsert: (path: string) => void }) {
    const { t } = useTranslation('applications');

    const variables = getTemplateVariables(t);

    return (
        <Dropdown
            trigger={['click']}
            dropdownRender={() => (
                <div className="variable-insert-menu">
                    {variables.map((v) => (
                        <button
                            key={v.path}
                            type="button"
                            className="variable-insert-menu__item"
                            onClick={() => onInsert(v.path)}
                        >
                            <code>{`{{${v.path}}}`}</code>
                            <span className="step-variable-hint">{v.label}</span>
                        </button>
                    ))}
                </div>
            )}
        >
            <Button size="small" icon={<Variable size={13} />}>
                {t('pipelineSteps.variableButton')}
            </Button>
        </Dropdown>
    );
}

function StepEditorDrawer({
    open,
    onClose,
    step,
    onSubmit,
    submitting,
    activeMembers,
    targetVariables,
}: {
    open: boolean;
    onClose: () => void;
    step: PipelineStep | null;
    onSubmit: (
        data: { label: string; type: StepType; config: DraftConfig; timeout_seconds: number | null; continue_on_failure: boolean },
        onCreateSuccess: () => void,
    ) => void;
    submitting: boolean;
    activeMembers: { id: number; name: string; email: string }[];
    targetVariables: import('@/types/models').TargetVariable[];
}) {
    const { t } = useTranslation('applications');
    const [type, setType] = useState<StepType>('command');
    const [label, setLabel] = useState('');
    const [config, setConfig] = useState<DraftConfig>(defaultConfigFor('command'));
    const [timeoutSeconds, setTimeoutSeconds] = useState<number | null>(null);
    const [continueOnFailure, setContinueOnFailure] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    // Tant que l'utilisateur n'a pas lui-même modifié le nom, on le fait
    // suivre la commande en direct (pratique pour aller vite) — dès qu'il y
    // touche, on arrête de l'écraser. Toujours "touché" en modification :
    // on ne réécrit jamais le nom existant d'une étape sous le pied de
    // l'utilisateur, il l'édite lui-même s'il le souhaite.
    const labelTouchedRef = useRef(false);

    const labelRef = useRef<InputRef>(null);
    const commandRef = useRef<TextAreaRef>(null);
    const subjectRef = useRef<InputRef>(null);
    const bodyRef = useRef<TextAreaRef>(null);
    const { errors } = usePage<PageProps>().props;
    const validationErrors = Object.entries(errors ?? {}).filter(([key]) => key === 'label' || key === 'type' || key.startsWith('config.'));

    useEffect(() => {
        if (!open) return;

        if (step) {
            setType(step.type);
            setLabel(step.label);
            setConfig(step.config);
            setTimeoutSeconds(step.timeout_seconds);
            setContinueOnFailure(step.continue_on_failure);
            labelTouchedRef.current = true;
        } else {
            setType('command');
            setLabel('');
            setConfig(defaultConfigFor('command'));
            setTimeoutSeconds(null);
            setContinueOnFailure(false);
            labelTouchedRef.current = false;
        }
        setShowPreview(false);
    }, [open, step]);

    const changeType = (next: StepType) => {
        setType(next);
        setConfig(defaultConfigFor(next));
    };

    const insertIntoSubject = (path: string) => {
        setConfig((c) => ({
            ...c,
            subject: insertAtCursor(subjectRef.current?.input, c.subject ?? '', `{{${path}}}`),
        }));
    };

    const insertIntoBody = (path: string) => {
        setConfig((c) => ({
            ...c,
            body: insertAtCursor(bodyRef.current?.resizableTextArea?.textArea, c.body ?? '', `{{${path}}}`),
        }));
    };

    const canSubmit = useMemo(() => {
        if (!label.trim()) return false;
        if (type === 'command') return !!(config as CommandStepConfig).command?.trim();
        const email = config as EmailStepConfig;
        return (email.to?.length ?? 0) > 0 && !!email.subject?.trim() && !!email.body?.trim();
    }, [label, type, config]);

    /** Après une création, on garde le tiroir ouvert et on vide juste les champs (type conservé) pour enchaîner. */
    const resetForNextStep = () => {
        setLabel('');
        setConfig(defaultConfigFor(type));
        setTimeoutSeconds(null);
        setContinueOnFailure(false);
        setShowPreview(false);
        labelTouchedRef.current = false;
        labelRef.current?.focus();
    };

    return (
        <Drawer
            open={open}
            onClose={onClose}
            width="min(560px, 92vw)"
            title={step ? t('pipelineSteps.drawer.editTitle') : t('pipelineSteps.drawer.newTitle')}
            destroyOnClose
            footer={
                <div className="form-actions form-actions--end">
                    <Button onClick={onClose}>{step ? t('pipelineSteps.drawer.cancel') : t('pipelineSteps.drawer.close')}</Button>
                    <Button
                        type="primary"
                        loading={submitting}
                        disabled={!canSubmit}
                        onClick={() =>
                            onSubmit(
                                {
                                    label,
                                    type,
                                    config,
                                    timeout_seconds: timeoutSeconds,
                                    continue_on_failure: continueOnFailure,
                                },
                                resetForNextStep,
                            )
                        }
                    >
                        {step ? t('pipelineSteps.drawer.save') : t('pipelineSteps.drawer.addStep')}
                    </Button>
                </div>
            }
        >
            <div className="form-stack">
                {validationErrors.length > 0 && (
                    <Alert
                        type="error"
                        showIcon
                        message={t('pipelineSteps.drawer.errorTitle')}
                        description={
                            <ul className="step-editor__error-list">
                                {validationErrors.map(([key, message]) => (
                                    <li key={key}>{message}</li>
                                ))}
                            </ul>
                        }
                    />
                )}

                <div>
                    <label className="step-editor__field-label">{t('pipelineSteps.drawer.typeLabel')}</label>
                    <Segmented
                        block
                        value={type}
                        onChange={(v) => changeType(v as StepType)}
                        options={getStepTypeOptions(t).map((o) => ({
                            value: o.value,
                            label: (
                                <span className="step-editor__segment">
                                    {o.icon} {o.label}
                                </span>
                            ),
                        }))}
                    />
                </div>

                {type === 'command' && (
                    <div>
                        <div className="step-editor__field-header">
                            <label className="step-editor__field-label">{t('pipelineSteps.drawer.commandLabel')}</label>
                            {targetVariables.length > 0 && (
                                <Dropdown
                                    trigger={['click']}
                                    dropdownRender={() => (
                                        <div className="variable-insert-menu">
                                            {targetVariables.map((v) => (
                                                <button
                                                    key={v.id}
                                                    type="button"
                                                    className="variable-insert-menu__item"
                                                    onClick={() =>
                                                        setConfig((c) => ({
                                                            ...c,
                                                            command: insertAtCursor(
                                                                commandRef.current?.resizableTextArea?.textArea,
                                                                (c as CommandStepConfig).command ?? '',
                                                                `$${v.key}`,
                                                            ),
                                                        }))
                                                    }
                                                >
                                                    <code className="step-variable-hint">${v.key}</code>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                >
                                    <Button size="small" icon={<Variable size={13} />}>
                                        {t('pipelineSteps.variableButton')}
                                    </Button>
                                </Dropdown>
                            )}
                        </div>
                        <Input.TextArea
                            ref={commandRef}
                            className="step-editor__mono"
                            autoSize={{ minRows: 6, maxRows: 20 }}
                            value={(config as CommandStepConfig).command ?? ''}
                            onChange={(e) => {
                                const command = e.target.value;
                                setConfig((c) => ({ ...c, command }));

                                if (!labelTouchedRef.current) {
                                    setLabel(deriveLabelFromCommand(command));
                                }
                            }}
                            placeholder={t('pipelineSteps.drawer.commandPlaceholder')}
                        />
                        <p className="step-editor__field-hint">
                            {t('pipelineSteps.drawer.commandHint')}
                        </p>
                    </div>
                )}

                <div>
                    <label className="step-editor__field-label">{t('pipelineSteps.drawer.labelLabel')}</label>
                    <Input
                        ref={labelRef}
                        value={label}
                        onChange={(e) => {
                            labelTouchedRef.current = true;
                            setLabel(e.target.value);
                        }}
                        placeholder={t('pipelineSteps.drawer.labelPlaceholder')}
                    />
                </div>

                {type === 'email' && (
                    <>
                        <div>
                            <label className="step-editor__field-label">{t('pipelineSteps.drawer.recipientsLabel')}</label>
                            <Select
                                mode="multiple"
                                className="w-full"
                                value={(config as EmailStepConfig).to ?? []}
                                onChange={(to) => setConfig((c) => ({ ...c, to }))}
                                placeholder={t('pipelineSteps.drawer.recipientsPlaceholder')}
                                optionFilterProp="label"
                                options={activeMembers.map((member) => ({
                                    value: member.email,
                                    label: `${member.name} (${member.email})`,
                                }))}
                                notFoundContent={t('pipelineSteps.drawer.noActiveMembers')}
                            />
                        </div>

                        <div>
                            <div className="step-editor__field-header">
                                <label className="step-editor__field-label">{t('pipelineSteps.drawer.subjectLabel')}</label>
                                <VariableInsertButton onInsert={insertIntoSubject} />
                            </div>
                            <Input
                                ref={subjectRef}
                                value={(config as EmailStepConfig).subject ?? ''}
                                onChange={(e) => setConfig((c) => ({ ...c, subject: e.target.value }))}
                                placeholder="[{{application.name}}] Déploiement {{environment.name}}"
                            />
                        </div>

                        <div>
                            <div className="step-editor__field-header">
                                <label className="step-editor__field-label">{t('pipelineSteps.drawer.messageLabel')}</label>
                                <div className="step-editor__field-actions">
                                    <VariableInsertButton onInsert={insertIntoBody} />
                                    <Tooltip title={t('pipelineSteps.drawer.previewTooltip')}>
                                        <Button size="small" icon={<Eye size={13} />} onClick={() => setShowPreview((v) => !v)}>
                                            {t('pipelineSteps.drawer.previewButton')}
                                        </Button>
                                    </Tooltip>
                                </div>
                            </div>
                            <Input.TextArea
                                ref={bodyRef}
                                rows={6}
                                value={(config as EmailStepConfig).body ?? ''}
                                onChange={(e) => setConfig((c) => ({ ...c, body: e.target.value }))}
                                placeholder="Le déploiement de {{target.name}} sur {{environment.name}} est terminé ({{deployment.status}})."
                            />
                            {showPreview && (
                                <Alert
                                    className="step-editor__preview"
                                    type="info"
                                    message={
                                        <div>
                                            <div>
                                                <strong>{t('pipelineSteps.drawer.previewSubjectLabel')}</strong> {interpolatePreview((config as EmailStepConfig).subject ?? '')}
                                            </div>
                                            <div className="step-editor__preview-body">
                                                {interpolatePreview((config as EmailStepConfig).body ?? '')}
                                            </div>
                                        </div>
                                    }
                                />
                            )}
                        </div>
                    </>
                )}

                <div className="step-editor__row">
                    <div>
                        <label className="step-editor__field-label">{t('pipelineSteps.drawer.timeoutLabel')}</label>
                        <InputNumber
                            min={1}
                            max={3600}
                            placeholder={t('pipelineSteps.drawer.timeoutPlaceholder')}
                            value={timeoutSeconds}
                            onChange={setTimeoutSeconds}
                            controls={false}
                        />
                    </div>
                    <div className="step-editor__continue-toggle">
                        <Switch checked={continueOnFailure} onChange={setContinueOnFailure} />
                        <span>{t('pipelineSteps.drawer.continueOnFailureLabel')}</span>
                    </div>
                </div>
            </div>
        </Drawer>
    );
}

function SortableStepRow({
    step,
    index,
    canManage,
    onEdit,
    onDelete,
}: {
    step: PipelineStep;
    index: number;
    canManage: boolean;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const { t } = useTranslation('applications');
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: step.id,
    });

    return (
        <div
            ref={setNodeRef}
            className="step-row"
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
                opacity: isDragging ? 0.5 : 1,
            }}
        >
            <span
                {...(canManage ? { ...attributes, ...listeners } : {})}
                className="step-row__handle"
            >
                <GripVertical size={14} />
            </span>

            <span className="step-row__order">{index + 1}</span>

            <Tooltip title={step.type === 'command' ? t('pipelineSteps.row.commandTooltip') : t('pipelineSteps.row.emailTooltip')}>
                <span className={`step-row__type step-row__type--${step.type}`}>{stepTypeIcon(step.type)}</span>
            </Tooltip>

            <span className="step-row__label">{step.label}</span>

            <span className="step-row__command" title={stepSummary(step, t)}>
                {stepSummary(step, t)}
            </span>

            <Tooltip title={t('pipelineSteps.row.timeoutTooltip')}>
                <span className="step-row__timeout">{step.timeout_seconds ? `${step.timeout_seconds}s` : '—'}</span>
            </Tooltip>

            <Tooltip title={t('pipelineSteps.row.continueTooltip')}>
                <span className={`step-row__continue ${step.continue_on_failure ? 'step-row__continue--active' : ''}`}>
                    {step.continue_on_failure ? t('pipelineSteps.row.yes') : t('pipelineSteps.row.no')}
                </span>
            </Tooltip>

            {canManage && (
                <>
                    <Tooltip title={t('pipelineSteps.row.editTooltip')}>
                        <button type="button" className="step-row__edit" onClick={onEdit} aria-label={t('pipelineSteps.row.editAriaLabel')}>
                            <Pencil size={14} />
                        </button>
                    </Tooltip>
                    <Tooltip title={t('pipelineSteps.row.deleteTooltip')}>
                        <button type="button" className="step-row__delete" onClick={onDelete} aria-label={t('pipelineSteps.row.deleteAriaLabel')}>
                            <Trash2 size={14} />
                        </button>
                    </Tooltip>
                </>
            )}
        </div>
    );
}

export default function PipelineStepsPanel({
    application,
    target,
    canManage,
    activeMembers,
}: {
    application: Application;
    target: Target;
    canManage: boolean;
    activeMembers: { id: number; name: string; email: string }[];
}) {
    const { t } = useTranslation('applications');
    const { workspace } = usePage<PageProps>().props;
    const [steps, setSteps] = useState(target.pipeline_steps);
    const [editingStep, setEditingStep] = useState<PipelineStep | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const confirm = useConfirm();

    useEffect(() => {
        setSteps(target.pipeline_steps);
    }, [target.pipeline_steps]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const openCreate = () => {
        setEditingStep(null);
        setDrawerOpen(true);
    };

    const openEdit = (step: PipelineStep) => {
        setEditingStep(step);
        setDrawerOpen(true);
    };

    const deleteStep = (step: PipelineStep) => {
        confirm.confirm({
            title: t('pipelineSteps.confirmDelete.title', { label: step.label }),
            okType: 'danger',
            okText: t('pipelineSteps.confirmDelete.okText'),
            cancelText: t('pipelineSteps.confirmDelete.cancelText'),
            onOk: () => {
                router.delete(
                    route('pipeline-steps.destroy', [workspace!.slug, application.slug, target.uuid, step.uuid]),
                    persistOptions,
                );
            },
        });
    };

    const submit = (
        data: { label: string; type: StepType; config: DraftConfig; timeout_seconds: number | null; continue_on_failure: boolean },
        onCreateSuccess: () => void,
    ) => {
        setSubmitting(true);

        const options = {
            ...persistOptions,
            onSuccess: () => {
                if (editingStep) {
                    setDrawerOpen(false);
                } else {
                    // On laisse le tiroir ouvert et on réinitialise le formulaire pour
                    // permettre d'enchaîner rapidement l'ajout de plusieurs étapes.
                    onCreateSuccess();
                }
            },
            onFinish: () => setSubmitting(false),
        };

        if (editingStep) {
            router.patch(route('pipeline-steps.update', [workspace!.slug, application.slug, target.uuid, editingStep.uuid]), data, options);
        } else {
            router.post(route('pipeline-steps.store', [workspace!.slug, application.slug, target.uuid]), data, options);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over || active.id === over.id) {
            return;
        }

        const oldIndex = steps.findIndex((s) => s.id === active.id);
        const newIndex = steps.findIndex((s) => s.id === over.id);
        const reordered = arrayMove(steps, oldIndex, newIndex);

        setSteps(reordered);

        router.post(
            route('pipeline-steps.reorder', [workspace!.slug, application.slug, target.uuid]),
            { ids: reordered.map((s) => s.id) },
            persistOptions,
        );
    };

    return (
        <div className="step-list">
            {steps.length === 0 && !canManage ? (
                <Empty description={t('pipelineSteps.emptyDescription')} />
            ) : (
                <>
                    <div className="step-row step-row--header">
                        <span className="step-row__handle" />
                        <span className="step-row__order">#</span>
                        <span className="step-row__type" />
                        <span className="step-row__label">{t('pipelineSteps.header.stepColumn')}</span>
                        <span className="step-row__command">{t('pipelineSteps.header.detailColumn')}</span>
                        <span className="step-row__timeout">{t('pipelineSteps.header.timeoutColumn')}</span>
                        <span className="step-row__continue">{t('pipelineSteps.header.continueColumn')}</span>
                        <span />
                        <span />
                    </div>

                    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                        <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                            {steps.map((step, index) => (
                                <SortableStepRow
                                    key={step.id}
                                    step={step}
                                    index={index}
                                    canManage={canManage}
                                    onEdit={() => openEdit(step)}
                                    onDelete={() => deleteStep(step)}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                </>
            )}

            {canManage && (
                <div className="step-list__add">
                    <Button type="dashed" icon={<Plus size={14} />} onClick={openCreate} block>
                        {t('pipelineSteps.addStep')}
                    </Button>
                </div>
            )}

            <StepEditorDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                step={editingStep}
                onSubmit={submit}
                submitting={submitting}
                activeMembers={activeMembers}
                targetVariables={target.variables}
            />
        </div>
    );
}
