import { PageProps } from '@/types';
import { Application, EnvironmentVariable, TargetEnvironmentLink } from '@/types/models';
import { router, useForm, usePage } from '@inertiajs/react';
import { Input, Switch, Tooltip } from 'antd';
import { Plus, Trash2 } from 'lucide-react';
import { FormEventHandler, useEffect, useRef, useState } from 'react';
import type { InputRef } from 'antd';

const persistOptions = { preserveScroll: true, preserveState: true } as const;

function VariableRow({
    application,
    variable,
    canManage,
}: {
    application: Application;
    variable: EnvironmentVariable;
    canManage: boolean;
}) {
    const { workspace } = usePage<PageProps>().props;
    const [value, setValue] = useState(variable.value);

    useEffect(() => setValue(variable.value), [variable.value]);

    const patch = (data: Partial<{ value: string; is_secret: boolean }>) => {
        router.patch(
            route('environment-variables.update', [workspace!.slug, application.slug, variable.id]),
            { key: variable.key, value, is_secret: variable.is_secret, ...data },
            persistOptions,
        );
    };

    return (
        <div className="var-row">
            <span className="var-row__key">{variable.key}</span>

            <Input
                className="var-row__value"
                type={variable.is_secret ? 'password' : 'text'}
                value={value}
                disabled={!canManage}
                onChange={(e) => setValue(e.target.value)}
                onBlur={() => value !== variable.value && patch({ value })}
                variant="borderless"
            />

            <Tooltip title="Masquer la valeur dans l'interface et les journaux de déploiement">
                <Switch
                    className="var-row__secret"
                    size="small"
                    checked={variable.is_secret}
                    disabled={!canManage}
                    onChange={(is_secret) => patch({ is_secret })}
                />
            </Tooltip>

            {canManage && (
                <Tooltip title="Supprimer la variable">
                    <button
                        type="button"
                        className="var-row__delete"
                        aria-label="Supprimer la variable"
                        onClick={() =>
                            router.delete(
                                route('environment-variables.destroy', [workspace!.slug, application.slug, variable.id]),
                                persistOptions,
                            )
                        }
                    >
                        <Trash2 size={14} />
                    </button>
                </Tooltip>
            )}
        </div>
    );
}

function AddVariableRow({ application, targetEnvironment }: { application: Application; targetEnvironment: TargetEnvironmentLink }) {
    const { workspace } = usePage<PageProps>().props;
    const { data, setData, post, processing, reset } = useForm({
        key: '',
        value: '',
        is_secret: false,
    });
    const keyRef = useRef<InputRef>(null);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (!data.key.trim() || !data.value.trim() || processing) return;

        post(route('environment-variables.store', [workspace!.slug, application.slug, targetEnvironment.id]), {
            ...persistOptions,
            onSuccess: () => {
                reset();
                keyRef.current?.focus();
            },
        });
    };

    return (
        <form className="var-row var-row--add" onSubmit={submit}>
            <div className="var-row--add-fields">
                <Input
                    ref={keyRef}
                    className="var-row__key-input"
                    placeholder="New key"
                    value={data.key}
                    onChange={(e) => setData('key', e.target.value.toUpperCase())}
                    variant="borderless"
                />
                <Input
                    className="var-row__value"
                    placeholder="New value"
                    value={data.value}
                    onChange={(e) => setData('value', e.target.value)}
                    variant="borderless"
                />
                <Switch
                    className="var-row__secret"
                    size="small"
                    checked={data.is_secret}
                    onChange={(is_secret) => setData('is_secret', is_secret)}
                />
            </div>
            <button type="submit" className="var-row__add-btn" disabled={processing || !data.key.trim() || !data.value.trim()}>
                <Plus size={14} /> Add variable
            </button>
        </form>
    );
}

export default function VariablesEditor({
    application,
    targetEnvironment,
    canManage,
}: {
    application: Application;
    targetEnvironment: TargetEnvironmentLink;
    canManage: boolean;
}) {
    return (
        <div className="var-table">
            <div className="var-row var-row--header">
                <span>Key</span>
                <span>Value</span>
                <span>Secret</span>
                <span>Actions</span>
            </div>

            {targetEnvironment.variables.map((variable) => (
                <VariableRow key={variable.id} application={application} variable={variable} canManage={canManage} />
            ))}

            {canManage && <AddVariableRow application={application} targetEnvironment={targetEnvironment} />}
        </div>
    );
}
