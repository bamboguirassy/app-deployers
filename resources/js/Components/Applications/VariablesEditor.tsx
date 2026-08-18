import { PageProps } from '@/types';
import { Application, EnvironmentVariable, Target, TargetEnvironmentLink, TargetVariable } from '@/types/models';
import { useForm, usePage } from '@inertiajs/react';
import { Alert, Button, Input, Tooltip } from 'antd';
import { Eye, EyeOff } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Grille guidée de variables d'environnement pour un TargetEnvironment.
 * Les clés sont définies au niveau du Target (TargetVariable) — l'utilisateur
 * renseigne uniquement la valeur pour cet environnement spécifique.
 * Toutes les variables sont soumises en une seule requête.
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

    const buildInitialValues = () =>
        target.variables.reduce<Record<string, string>>((acc, v) => {
            const existing = targetEnvironment.variables.find(
                (ev: EnvironmentVariable) => ev.target_variable_id === v.id,
            );
            acc[v.id] = existing?.value ?? '';
            return acc;
        }, {});

    const { data, setData, post, processing, errors, reset } = useForm<{
        variables: { target_variable_id: number; value: string }[];
    }>({ variables: [] });

    // Synchronise le formulaire quand les variables du target ou les valeurs
    // enregistrées changent (retour serveur après sauvegarde).
    useEffect(() => {
        const vals = buildInitialValues();
        setData('variables', target.variables.map((v) => ({
            target_variable_id: v.id,
            value: vals[v.id] ?? '',
        })));
    }, [target.variables, targetEnvironment.variables]);

    const setValue = (variableId: number, value: string) => {
        setData('variables', data.variables.map((row) =>
            row.target_variable_id === variableId ? { ...row, value } : row,
        ));
    };

    const getRow = (variableId: number) =>
        data.variables.find((r) => r.target_variable_id === variableId);

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
                const value = row?.value ?? '';
                const hasDefault = targetVar.default_value !== null;

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

                        <Input
                            className="var-row__value"
                            type={targetVar.is_secret ? 'password' : 'text'}
                            value={value}
                            disabled={!canManage}
                            placeholder={
                                hasDefault
                                    ? t('variablesEditor.defaultPlaceholder')
                                    : t('variablesEditor.requiredPlaceholder')
                            }
                            onChange={(e) => setValue(targetVar.id, e.target.value)}
                            variant="borderless"
                            status={!value && !hasDefault ? 'error' : undefined}
                        />

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
