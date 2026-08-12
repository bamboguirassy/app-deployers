import DeploymentsList, { DeploymentsListHandle } from '@/Components/Deployments/DeploymentsList';
import PrimaryButton from '@/Components/PrimaryButton';
import { DeploymentKpis } from '@/constants/deployments';
import { PageProps } from '@/types';
import { Application, Deployment } from '@/types/models';
import { router, usePage } from '@inertiajs/react';
import { Modal, Select, Tooltip } from 'antd';
import { Rocket } from 'lucide-react';
import { useRef, useState } from 'react';

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
        <div>
            <DeploymentsList
                ref={listRef}
                searchUrl={route('deployments.search', [workspace!.slug, application.slug])}
                initialItems={deployments.data}
                initialKpis={kpis}
                getRowHref={(deployment) => route('deployments.show', [workspace!.slug, application.slug, deployment.uuid])}
                actions={
                    canDeploy && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                            <Tooltip
                                title={
                                    options.length === 0
                                        ? "Configurez d'abord un couple target/environnement dans l'onglet Environnements"
                                        : undefined
                                }
                            >
                                <span>
                                    <PrimaryButton
                                        size="small"
                                        icon={<Rocket size={14} />}
                                        onClick={() => setTriggering(true)}
                                        disabled={options.length === 0}
                                    >
                                        Nouveau déploiement
                                    </PrimaryButton>
                                </span>
                            </Tooltip>
                        </div>
                    )
                }
            />

            <Modal
                title="Nouveau déploiement"
                open={triggering}
                onCancel={() => setTriggering(false)}
                onOk={deploy}
                okText="Déployer"
                okButtonProps={{ disabled: !selected }}
                destroyOnClose
            >
                <Select
                    className="w-full"
                    placeholder="Choisir un target × environnement"
                    style={{ width: '100%' }}
                    options={options}
                    value={selected}
                    onChange={setSelected}
                />
                {options.length === 0 && (
                    <p className="section-hint" style={{ marginTop: 8 }}>
                        Aucun couple target/environnement configuré. Configurez-en un depuis
                        l&apos;onglet Environnements.
                    </p>
                )}
            </Modal>
        </div>
    );
}
