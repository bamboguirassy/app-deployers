import { useConfirm } from '@/theme/ConfirmContext';
import { PageProps } from '@/types';
import { Application, PipelineStep, Target } from '@/types/models';
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
import { Empty, Input, InputNumber, Tooltip } from 'antd';
import type { InputRef } from 'antd';
import { GripVertical, Plus, RefreshCcw, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const persistOptions = { preserveScroll: true, preserveState: true } as const;

function SortableStepRow({
    step,
    index,
    canManage,
    onDelete,
    updateUrl,
}: {
    step: PipelineStep;
    index: number;
    canManage: boolean;
    onDelete: () => void;
    updateUrl: string;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: step.id,
    });

    const [label, setLabel] = useState(step.label);
    const [command, setCommand] = useState(step.command);
    const [timeout, setTimeoutValue] = useState<number | null>(step.timeout_seconds);

    useEffect(() => setLabel(step.label), [step.label]);
    useEffect(() => setCommand(step.command), [step.command]);
    useEffect(() => setTimeoutValue(step.timeout_seconds), [step.timeout_seconds]);

    const patch = (data: Partial<{ label: string; command: string; timeout_seconds: number | null; continue_on_failure: boolean }>) => {
        router.patch(updateUrl, { label, command, timeout_seconds: timeout, continue_on_failure: step.continue_on_failure, ...data }, persistOptions);
    };

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

            <Input
                className="step-row__label"
                value={label}
                disabled={!canManage}
                onChange={(e) => setLabel(e.target.value)}
                onBlur={() => label !== step.label && label.trim() && patch({ label })}
                variant="borderless"
            />

            <Input
                className="step-row__command"
                value={command}
                disabled={!canManage}
                onChange={(e) => setCommand(e.target.value)}
                onBlur={() => command !== step.command && command.trim() && patch({ command })}
                variant="borderless"
            />

            <Tooltip title="Timeout (secondes)">
                <InputNumber
                    className="step-row__timeout"
                    size="small"
                    min={1}
                    max={3600}
                    placeholder="—"
                    value={timeout}
                    disabled={!canManage}
                    onChange={(value) => setTimeoutValue(value)}
                    onBlur={() => timeout !== step.timeout_seconds && patch({ timeout_seconds: timeout })}
                    controls={false}
                />
            </Tooltip>

            <Tooltip title="Continuer le pipeline même si cette étape échoue">
                <button
                    type="button"
                    className={`step-row__continue ${step.continue_on_failure ? 'step-row__continue--active' : ''}`}
                    disabled={!canManage}
                    onClick={() => patch({ continue_on_failure: !step.continue_on_failure })}
                >
                    <RefreshCcw size={14} />
                </button>
            </Tooltip>

            {canManage && (
                <Tooltip title="Supprimer l'étape">
                    <button type="button" className="step-row__delete" onClick={onDelete} aria-label="Supprimer l'étape">
                        <Trash2 size={14} />
                    </button>
                </Tooltip>
            )}
        </div>
    );
}

function AddStepRow({ application, target }: { application: Application; target: Target }) {
    const { workspace } = usePage<PageProps>().props;
    const [label, setLabel] = useState('');
    const [command, setCommand] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const labelRef = useRef<InputRef>(null);

    const submit = () => {
        if (!label.trim() || !command.trim() || submitting) return;

        setSubmitting(true);
        router.post(
            route('pipeline-steps.store', [workspace!.slug, application.slug, target.id]),
            { label, command },
            {
                ...persistOptions,
                onSuccess: () => {
                    setLabel('');
                    setCommand('');
                    labelRef.current?.focus();
                },
                onFinish: () => setSubmitting(false),
            },
        );
    };

    return (
        <div className="step-row step-row--add">
            <span className="step-row__handle step-row__handle--add">
                <Plus size={14} />
            </span>
            <span className="step-row__order">—</span>
            <Input
                ref={labelRef}
                className="step-row__label"
                placeholder="Nom de l'étape"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onPressEnter={submit}
                variant="borderless"
            />
            <Input
                className="step-row__command"
                placeholder="Commande shell"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onPressEnter={submit}
                variant="borderless"
            />
            <button type="button" className="step-row__add-btn" onClick={submit} disabled={submitting || !label.trim() || !command.trim()}>
                <Plus size={14} /> Ajouter
            </button>
        </div>
    );
}

export default function PipelineStepsPanel({
    application,
    target,
    canManage,
}: {
    application: Application;
    target: Target;
    canManage: boolean;
}) {
    const { workspace } = usePage<PageProps>().props;
    const [steps, setSteps] = useState(target.pipeline_steps);
    const confirm = useConfirm();

    useEffect(() => {
        setSteps(target.pipeline_steps);
    }, [target.pipeline_steps]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const deleteStep = (step: PipelineStep) => {
        confirm.confirm({
            title: `Supprimer l'étape "${step.label}" ?`,
            okType: 'danger',
            okText: 'Supprimer',
            cancelText: 'Annuler',
            onOk: () => {
                router.delete(
                    route('pipeline-steps.destroy', [workspace!.slug, application.slug, target.id, step.id]),
                    persistOptions,
                );
            },
        });
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
            route('pipeline-steps.reorder', [workspace!.slug, application.slug, target.id]),
            { ids: reordered.map((s) => s.id) },
            persistOptions,
        );
    };

    return (
        <div className="step-list">
            {steps.length === 0 && !canManage ? (
                <Empty description="Aucune étape définie" />
            ) : (
                <>
                    <div className="step-row step-row--header">
                        <span className="step-row__handle" />
                        <span className="step-row__order">#</span>
                        <span className="step-row__label">Étape</span>
                        <span className="step-row__command">Commande</span>
                        <span className="step-row__timeout">Timeout</span>
                        <span className="step-row__continue">Continue</span>
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
                                    onDelete={() => deleteStep(step)}
                                    updateUrl={route('pipeline-steps.update', [workspace!.slug, application.slug, target.id, step.id])}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                </>
            )}

            {canManage && <AddStepRow application={application} target={target} />}
        </div>
    );
}
