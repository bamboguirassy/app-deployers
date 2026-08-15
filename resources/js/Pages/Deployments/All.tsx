import DeploymentsList, { DeploymentsListHandle } from '@/Components/Deployments/DeploymentsList';
import NewDeploymentModal, { DeployableApplication } from '@/Components/Deployments/NewDeploymentModal';
import PrimaryButton from '@/Components/PrimaryButton';
import { DeploymentKpis } from '@/constants/deployments';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { Deployment } from '@/types/models';
import { Head, usePage } from '@inertiajs/react';
import { Typography } from 'antd';
import { Rocket } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const { Title, Paragraph } = Typography;

export default function All({
    deployments,
    kpis,
    can,
    deployableApplications,
}: {
    deployments: { data: Deployment[] };
    kpis: DeploymentKpis;
    can: { deploy: boolean };
    deployableApplications: DeployableApplication[];
}) {
    const { workspace } = usePage<PageProps>().props;
    const { t } = useTranslation('deployments');
    const [creating, setCreating] = useState(false);
    const listRef = useRef<DeploymentsListHandle>(null);

    return (
        <AuthenticatedLayout header={t('all.header')}>
            <Head title={t('all.title')} />

            <div className="premium-list-hero">
                <div>
                    <div className="premium-list-eyebrow">{t('all.eyebrow')}</div>
                    <Title level={2} style={{ margin: 0 }}>
                        {t('all.title')}
                    </Title>
                    <Paragraph type="secondary" style={{ margin: '6px 0 0' }}>
                        {t('all.description')}
                    </Paragraph>
                </div>

                {can.deploy && (
                    <PrimaryButton className="premium-list-hero__action" icon={<Rocket size={14} />} onClick={() => setCreating(true)}>
                        {t('all.newDeployment')}
                    </PrimaryButton>
                )}
            </div>

            <DeploymentsList
                ref={listRef}
                searchUrl={route('deployments.all.search', workspace!.slug)}
                initialItems={deployments.data}
                initialKpis={kpis}
                showApplicationColumn
                getRowHref={(deployment) =>
                    route('deployments.show', [workspace!.slug, deployment.target_environment.target.application!.slug, deployment.uuid])
                }
            />

            {can.deploy && (
                <NewDeploymentModal
                    workspaceSlug={workspace!.slug}
                    applications={deployableApplications}
                    open={creating}
                    onClose={() => setCreating(false)}
                    onDeployed={() => listRef.current?.refresh()}
                />
            )}
        </AuthenticatedLayout>
    );
}
