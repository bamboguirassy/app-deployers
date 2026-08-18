import { PageProps } from '@/types';
import { Application, EnvironmentVariable, Target, TargetEnvironmentLink, TargetVariable } from '@/types/models';
import { router, useForm, usePage } from '@inertiajs/react';
import { Alert, Button, Input, Tooltip } from 'antd';
import { Eye, EyeOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Grille guidée de variables d'environnement pour un TargetEnvironment.
 * Les clés sont définies au niveau du Target (TargetVariable) — l'utilisateur
 * renseigne uniquement la valeur pour cet environnement spécifique.
 * Toutes les variables sont soumises en une seule requête.
 *
 * Les valeurs secrètes sont masquées dans les props Inertia (value = null).
 * Le formulaire soumet null pour les secrets non modifiés, le backend conserve
 * alors la valeur existante. Un bouton « Afficher » permet de les révéler à
 * la demande via un endpoint dédié.
 */
export default function VariablesEditor({
    application,
    target,
    targetEnvironment,
    canManage,
}: {
    application: Application;
    target: Target;
    targetEnvironment: TargetEnvironmentLink;
    canManage: boolean;
}) {
    const { t } = useTranslation('applications');
    const { workspace } = usePage<PageProps>().props;

    // Tracks which secret fields have been revealed: variableId → plaintext value
    const [revealed, setRevealed] = useState<Record<number, string>>({});
    const [revealing, setRevealing] = useState<Record<number, boolean>>({});

    // null = valeur masquée côté serveur (secret existant), '' = champ vide
    const buildInitialValues = () =>
        target.variables.reduce<Record<string, string | null>>((acc, v) => {
            const existing = targetEnvironment.variables.find(
                (ev: EnvironmentVariable) => ev.target_variable_id === v.id,
            );
            // Pour les secrets, existing.value est null (masqué) — on garde null
            // pour signaler au backend « ne pas toucher à la valeur existante ».
            acc[v.id] = existing?.value ?? (v.is_secret ? null : '');
            return acc;
        }, {});

    const { data, setData, post, processing, errors, reset } = useForm<{
        variables: { target_variable_id: number; value: string | null }[];
    }>({ variables: [] });

    useEffect(() => {
        const vals = buildInitialValues();
        setData('variables', target.variables.map((v) => ({
            target_variable_id: v.id,
            value: vals[v.id] ?? null,
        })));
        // Reset revealed state when variables change (e.g. after save)
        setRevealed({});
    }, [target.variables, targetEnvironment.variables]);

    const setValue = (variableId: number, value: string) => {
        setData('variables', data.variables.map((row) =>
            row.target_variable_id === variableId ? { ...row, value } : row,
        ));
        // Clear revealed once the user starts typing a new value
        setRevealed((prev) => { const n = { ...prev }; delete n[variableId]; return n; });
    };

    const getRow = (variableId: number) =>
        data.variables.find((r) => r.target_variable_id === variableId);

    const revealSecret = async (targetVar: TargetVariable, envVar: EnvironmentVariable | undefined) => {
        if (!envVar) return;
        setRevealing((prev) => ({ ...prev, [targetVar.id]: true }));
        try {
            const response = await fetch(
                route('environment-variables.reveal', [
                    workspace!.slug,
                    application.slug,
                    targetEnvironment.uuid,
                    envVar.uuid,
                ]),
                { method: 'POST', headers: { 'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '', 'Accept': 'application/json' } },
            );
            if (response.ok) {
                const json = await response.json();
                setRevealed((prev) => ({ ...prev, [targetVar.id]: json.value }));
            }
        } finally {
            setRevealing((prev) => { const n = { ...prev }; delete n[targetVar.id]; return n; });
        }
    };

    const hideSecret = (variableId: number) => {
        setRevealed((prev) => { const n = { ...prev }; delete n[variableId]; return n; });
    };

    const save = () => {
        post(route('environment-variables.upsert', [workspace!.slug, application.slug, targetEnvironment.uuid]), {
            preserveScroll: true,
            preserveState: true,
        });
    };

    if (target.variables.length === 0) {
        return (
            <p className="var-table__empty">{t('variablesEditor.noVariablesDefined')}</p>
        );
    }

    const globalError = (errors as Record<string, string>).variables;

    return (
        <div className="var-table">
            {globalError && (
                <Alert type="error" message={globalError} className="mb-2" showIcon />
            )}

            <div className="var-row var-row--header">
                <span>{t('variablesEditor.columns.key')}</span>
                <span>{t('variablesEditor.columns.value')}</span>
                <span>{t('variablesEditor.columns.secret')}</span>
            </div>

            {target.variables.map((targetVar: TargetVariable) => {
                const row = getRow(targetVar.id);
                const existingEnvVar = targetEnvironment.variables.find(
                    (ev: EnvironmentVariable) => ev.target_variable_id === targetVar.id,
                );
                const isMasked = targetVar.is_secret && row?.value === null;
                const isRevealed = targetVar.id in revealed;
                const hasDefault = targetVar.default_value !== null;
                const displayValue = isRevealed ? revealed[targetVar.id] : (row?.value ?? '');

                return (
                    <div key={targetVar.id} className="var-row">
                        <span className="var-row__key">
                            <code>{targetVar.key}</code>
                            {hasDefault && (
                                <Tooltip title={t('variablesEditor.hasDefaultTooltip')}>
                                    <span className="var-row__default-badge">
                                        {t('variablesEditor.defaultBadge')}
                                    </span>
                                </Tooltip>
                            )}
                        </span>

                        {isMasked && !isRevealed ? (
                            <span className="var-row__masked">
                                <span className="var-row__masked-dots">••••••••</span>
                                {canManage && existingEnvVar && (
                                    <Button
                                        size="small"
                                        type="text"
                                        loading={revealing[targetVar.id]}
                                        onClick={() => revealSecret(targetVar, existingEnvVar)}
                                    >
                                        {t('variablesEditor.reveal')}
                                    </Button>
                                )}
                            </span>
                        ) : (
                            <Input
                                className="var-row__value"
                                type={targetVar.is_secret && !isRevealed ? 'password' : 'text'}
                                value={displayValue}
                                disabled={!canManage}
                                placeholder={
                                    hasDefault
                                        ? t('variablesEditor.defaultPlaceholder')
                                        : t('variablesEditor.requiredPlaceholder')
                                }
                                onChange={(e) => setValue(targetVar.id, e.target.value)}
                                variant="borderless"
                                status={!displayValue && !hasDefault && !isMasked ? 'error' : undefined}
                                addonAfter={isRevealed ? (
                                    <Button size="small" type="text" onClick={() => hideSecret(targetVar.id)}>
                                        {t('variablesEditor.hide')}
                                    </Button>
                                ) : undefined}
                            />
                        )}

                        <Tooltip title={targetVar.is_secret ? t('variablesEditor.secretValue') : t('variablesEditor.visibleValue')}>
                            <span className="var-row__secret-icon">
                                {targetVar.is_secret ? <EyeOff size={13} /> : <Eye size={13} />}
                            </span>
                        </Tooltip>
                    </div>
                );
            })}

            {canManage && (
                <div className="var-table__footer">
                    <Button type="primary" size="small" loading={processing} onClick={save}>
                        {t('variablesEditor.save')}
                    </Button>
                </div>
            )}
        </div>
    );
}
