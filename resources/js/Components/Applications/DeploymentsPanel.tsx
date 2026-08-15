import DeploymentsList, { DeploymentsListHandle } from '@/Components/Deployments/DeploymentsList';
import PrimaryButton from '@/Components/PrimaryButton';
import { DeploymentKpis } from '@/constants/deployments';
import { PageProps } from '@/types';
import { Application, Deployment } from '@/types/models';
import { router, usePage } from '@inertiajs/react';
import { Modal, Select, Tooltip } from 'antd';
import { Activity, Rocket } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function DeploymentsPanel({
    application,
    deployments,
    kpis,
    canDeploy,
}: {
    application: Application;
    deployments: { data: Deployment[] };
    kpis: DeploymentKpis;
    canDeploy: boolean;
}) {
    const { t } = useTranslation('applications');
    const { workspace } = usePage<PageProps>().props;
    const listRef = useRef<DeploymentsListHandle>(null);
    const [triggering, setTriggering] = useState(false);
    const [selected, setSelected] = useState<number | null>(null);

    const options = application.targets.flatMap((target) =>
        target.target_environments.map((te) => ({
            value: te.id,
            label: `${target.name} → ${te.environment.name}`,
        })),
    );

    const deploy = () => {
        if (!selected) return;

        router.post(route('deployments.store', [workspace!.slug, application.slug, selected]), {}, {
            onSuccess: () => {
                setTriggering(false);
                listRef.current?.refresh();
            },
        });
    };

    return (
        <div className="application-deployments-panel application-resource-panel">
            <div className="application-resource-header application-resource-header--deployments">
                <div>
                    <h3>{t('deploymentsPanel.title')}</h3>
                    <span>{t('deploymentsPanel.subtitle')}</span>
                </div>
                <div className="application-resource-header__actions">
                    <Activity size={18} aria-hidden="true" />
                    {canDeploy && (
                        <Tooltip title={options.length === 0 ? t('deploymentsPanel.configureFirstTooltip') : undefined}>
                            <span>
                                <PrimaryButton size="small" icon={<Rocket size={14} />} onClick={() => setTriggering(true)} disabled={options.length === 0}>
                                    {t('deploymentsPanel.newDeployment')}
                                </PrimaryButton>
                            </span>
                        </Tooltip>
                    )}
                </div>
            </div>
            <DeploymentsList
                ref={listRef}
                searchUrl={route('deployments.search', [workspace!.slug, application.slug])}
                initialItems={deployments.data}
                initialKpis={kpis}
                getRowHref={(deployment) => route('deployments.show', [workspace!.slug, application.slug, deployment.uuid])}
                actions={null}
            />

            <Modal
                title={t('deploymentsPanel.modalTitle')}
                open={triggering}
                onCancel={() => setTriggering(false)}
                onOk={deploy}
                okText={t('deploymentsPanel.deployOk')}
                okButtonProps={{ disabled: !selected }}
                destroyOnClose
            >
                <Select
                    className="w-full"
                    placeholder={t('deploymentsPanel.selectPlaceholder')}
                    style={{ width: '100%' }}
                    options={options}
                    value={selected}
                    onChange={setSelected}
                />
                {options.length === 0 && (
                    <p className="section-hint" style={{ marginTop: 8 }}>
                        {t('deploymentsPanel.noPairsConfigured')}
                    </p>
                )}
            </Modal>
        </div>
    );
}
