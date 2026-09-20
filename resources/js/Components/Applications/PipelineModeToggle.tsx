import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import { useConfirm } from '@/theme/ConfirmContext';
import { PageProps } from '@/types';
import { Application, Target } from '@/types/models';
import { router, usePage } from '@inertiajs/react';
import { Alert, Modal, Select, Switch, Tooltip } from 'antd';
import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Bascule uniform_pipeline (voir App\Http\Controllers\TargetController::
 * disableUniformPipeline()/enableUniformPipeline()). Désactiver duplique le
 * pipeline actuel vers chaque environnement (destructif seulement dans le
 * sens où les steps uniformes d'origine sont ensuite supprimés côté
 * serveur — confirmé explicitement). Réactiver exige de choisir
 * l'environnement de référence, dont le pipeline devient le nouveau
 * pipeline unique ; les autres sont perdus.
 */
export default function PipelineModeToggle({
    application,
    target,
    canManage,
}: {
    application: Application;
    target: Target;
    canManage: boolean;
}) {
    const { t } = useTranslation('applications');
    const { workspace } = usePage<PageProps>().props;
    const confirm = useConfirm();
    const [enabling, setEnabling] = useState(false);
    const [referenceUuid, setReferenceUuid] = useState<string | undefined>(undefined);
    const [submitting, setSubmitting] = useState(false);

    const disable = () => {
        confirm.confirm({
            title: t('pipelineMode.confirmDisable.title'),
            content: t('pipelineMode.confirmDisable.content'),
            okText: t('pipelineMode.confirmDisable.okText'),
            cancelText: t('pipelineMode.confirmDisable.cancelText'),
            onOk: () =>
                router.post(
                    route('targets.pipeline-mode.disable-uniform', [workspace!.slug, application.slug, target.uuid]),
                    {},
                    { preserveScroll: true },
                ),
        });
    };

    const openEnableModal = () => {
        setReferenceUuid(undefined);
        setEnabling(true);
    };

    const confirmEnable = () => {
        if (!referenceUuid) return;
        setSubmitting(true);
        router.post(
            route('targets.pipeline-mode.enable-uniform', [workspace!.slug, application.slug, target.uuid]),
            { reference_target_environment_id: referenceUuid },
            {
                preserveScroll: true,
                onFinish: () => setSubmitting(false),
                onSuccess: () => setEnabling(false),
            },
        );
    };

    return (
        <div className="pipeline-mode-toggle">
            <Tooltip title={!canManage ? undefined : target.uniform_pipeline ? t('pipelineMode.hintUniform') : t('pipelineMode.hintNonUniform')}>
                <div className="pipeline-mode-toggle__row">
                    <Switch
                        checked={target.uniform_pipeline}
                        disabled={!canManage}
                        onChange={(checked) => (checked ? openEnableModal() : disable())}
                    />
                    <span className="pipeline-mode-toggle__label">{t('pipelineMode.label')}</span>
                </div>
            </Tooltip>
            <p className="pipeline-mode-toggle__hint">
                {target.uniform_pipeline ? t('pipelineMode.hintUniform') : t('pipelineMode.hintNonUniform')}
            </p>

            <Modal
                title={t('pipelineMode.enableModal.title')}
                open={enabling}
                onCancel={() => setEnabling(false)}
                footer={null}
                destroyOnClose
                width="min(480px, 92vw)"
            >
                <div className="form-stack">
                    <p className="section-hint" style={{ margin: 0 }}>
                        {t('pipelineMode.enableModal.description')}
                    </p>
                    <Select
                        placeholder={t('pipelineMode.enableModal.referencePlaceholder')}
                        value={referenceUuid}
                        onChange={setReferenceUuid}
                        options={target.target_environments.map((te) => ({
                            value: te.uuid,
                            label: te.environment.name,
                        }))}
                        style={{ width: '100%' }}
                    />
                    <Alert type="warning" showIcon icon={<AlertTriangle size={14} />} message={t('pipelineMode.enableModal.warning')} />
                    <div className="form-actions form-actions--end">
                        <SecondaryButton htmlType="button" onClick={() => setEnabling(false)}>
                            {t('pipelineMode.enableModal.cancel')}
                        </SecondaryButton>
                        <PrimaryButton disabled={!referenceUuid || submitting} loading={submitting} onClick={confirmEnable}>
                            {t('pipelineMode.enableModal.confirm')}
                        </PrimaryButton>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
