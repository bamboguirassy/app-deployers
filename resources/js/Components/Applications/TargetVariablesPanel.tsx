import { useConfirm } from '@/theme/ConfirmContext';
import { PageProps } from '@/types';
import { Application, Target, TargetVariable } from '@/types/models';
import { router, useForm, usePage } from '@inertiajs/react';
import { Button, Input, Switch, Tooltip } from 'antd';
import { Eye, EyeOff, GripVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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

const persistOptions = { preserveScroll: true, preserveState: true } as const;

function VariableFormRow({
    application,
    target,
    variable,
    onDone,
}: {
    application: Application;
    target: Target;
    variable?: TargetVariable;
    onDone: () => void;
}) {
    const { workspace } = usePage<PageProps>().props;
    const { t } = useTranslation('applications');
    const isEdit = !!variable;

    const { data, setData, post, patch, processing, errors, reset } = useForm({
        key: variable?.key ?? '',
        default_value: variable?.default_value ?? '',
        is_secret: variable?.is_secret ?? false,
    });

    const submit = () => {
        if (!data.key.trim() || processing) return;
        const opts = { ...persistOptions, onSuccess: () => { reset(); onDone(); } };

        if (isEdit) {
            patch(route('target-variables.update', [workspace!.slug, application.slug, variable!.uuid]), opts);
        } else {
            post(route('target-variables.store', [workspace!.slug, application.slug, target.uuid]), opts);
        }
    };

    return (
        <div className="target-var-form">
            <Input
                className="target-var-form__key"
                placeholder={t('targetVariables.keyPlaceholder')}
                value={data.key}
                onChange={(e) => setData('key', e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                status={errors.key ? 'error' : ''}
            />
            <Input
                className="target-var-form__default"
                placeholder={t('targetVariables.defaultValuePlaceholder')}
                type={data.is_secret ? 'password' : 'text'}
                value={data.default_value}
                onChange={(e) => setData('default_value', e.target.value)}
            />
            <Tooltip title={t('targetVariables.secretTooltip')}>
                <Switch size="small" checked={data.is_secret} onChange={(v) => setData('is_secret', v)} />
            </Tooltip>
            <Button size="small" type="primary" loading={processing} onClick={submit}>
                {isEdit ? t('targetVariables.save') : t('targetVariables.add')}
            </Button>
            <Button size="small" onClick={onDone}>{t('targetVariables.cancel')}</Button>
            {errors.key && <span className="field-error">{errors.key}</span>}
        </div>
    );
}

function VariableRow({
    application,
    variable,
    canManage,
}: {
    application: Application;
    variable: TargetVariable;
    canManage: boolean;
}) {
    const { workspace } = usePage<PageProps>().props;
    const { t } = useTranslation('applications');
    const confirm = useConfirm();
    const [editing, setEditing] = useState(false);
    const target = { uuid: variable.uuid } as Target;

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id: variable.id });

    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

    const destroy = () => {
        confirm.confirm({
            title: t('targetVariables.confirmDelete.title', { key: variable.key }),
            content: t('targetVariables.confirmDelete.content'),
            okType: 'danger',
            okText: t('targetVariables.confirmDelete.okText'),
            cancelText: t('targetVariables.confirmDelete.cancelText'),
            onOk: () =>
                router.delete(
                    route('target-variables.destroy', [workspace!.slug, application.slug, variable.uuid]),
                    persistOptions,
                ),
        });
    };

    if (editing) {
        return (
            <div ref={setNodeRef} style={style}>
                <VariableFormRow
                    application={application}
                    target={{ ...variable, pipeline_steps: [], target_environments: [], webhook_configs: [], variables: [] } as unknown as Target}
                    variable={variable}
                    onDone={() => setEditing(false)}
                />
            </div>
        );
    }

    return (
        <div ref={setNodeRef} style={style} className="target-var-row">
            {canManage && (
                <span className="target-var-row__drag" {...attributes} {...listeners} aria-label={t('targetVariables.dragAriaLabel')}>
                    <GripVertical size={14} />
                </span>
            )}
            <code className="target-var-row__key">{variable.key}</code>
            <span className="target-var-row__default">
                {variable.default_value
                    ? variable.is_secret
                        ? '••••••'
                        : variable.default_value
                    : <span className="target-var-row__no-default">{t('targetVariables.noDefault')}</span>}
            </span>
            <Tooltip title={variable.is_secret ? t('targetVariables.secret') : t('targetVariables.visible')}>
                <span className="target-var-row__secret-icon">
                    {variable.is_secret ? <EyeOff size={13} /> : <Eye size={13} />}
                </span>
            </Tooltip>
            {canManage && (
                <span className="target-var-row__actions">
                    <Tooltip title={t('targetVariables.editTooltip')}>
                        <button type="button" aria-label={t('targetVariables.editAriaLabel')} onClick={() => setEditing(true)}>
                            <Pencil size={13} />
                        </button>
                    </Tooltip>
                    <Tooltip title={t('targetVariables.deleteTooltip')}>
                        <button type="button" aria-label={t('targetVariables.deleteAriaLabel')} onClick={destroy}>
                            <Trash2 size={13} />
                        </button>
                    </Tooltip>
                </span>
            )}
        </div>
    );
}

export default function TargetVariablesPanel({
    application,
    target,
    canManage,
}: {
    application: Application;
    target: Target;
    canManage: boolean;
}) {
    const { workspace } = usePage<PageProps>().props;
    const { t } = useTranslation('applications');
    const [adding, setAdding] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = target.variables.findIndex((v) => v.id === active.id);
        const newIndex = target.variables.findIndex((v) => v.id === over.id);
        const reordered = arrayMove(target.variables, oldIndex, newIndex);

        router.post(
            route('target-variables.reorder', [workspace!.slug, application.slug, target.uuid]),
            { ids: reordered.map((v) => v.id) },
            persistOptions,
        );
    };

    return (
        <div className="target-var-panel">
            {target.variables.length > 0 && (
                <div className="target-var-row target-var-row--header">
                    <span />
                    <span>{t('targetVariables.columns.key')}</span>
                    <span>{t('targetVariables.columns.defaultValue')}</span>
                    <span>{t('targetVariables.columns.secret')}</span>
                    <span />
                </div>
            )}

            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                <SortableContext items={target.variables.map((v) => v.id)} strategy={verticalListSortingStrategy}>
                    {target.variables.map((variable) => (
                        <VariableRow
                            key={variable.id}
                            application={application}
                            variable={variable}
                            canManage={canManage}
                        />
                    ))}
                </SortableContext>
            </DndContext>

            {adding && (
                <VariableFormRow
                    application={application}
                    target={target}
                    onDone={() => setAdding(false)}
                />
            )}

            {canManage && !adding && (
                <button type="button" className="pipeline-add-btn" onClick={() => setAdding(true)}>
                    <Plus size={14} /> {t('targetVariables.addVariable')}
                </button>
            )}

            {target.variables.length === 0 && !adding && (
                <p className="target-var-panel__empty">{t('targetVariables.emptyDescription')}</p>
            )}
        </div>
    );
}
