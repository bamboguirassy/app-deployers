import DeploymentsList from '@/Components/Deployments/DeploymentsList';
import { DeploymentKpis } from '@/constants/deployments';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { Application, Deployment } from '@/types/models';
import { Head, usePage } from '@inertiajs/react';
import { Typography } from 'antd';

const { Title, Paragraph } = Typography;

export default function Index({
    application,
    deployments,
    kpis,
}: {
    application: Application;
    deployments: { data: Deployment[] };
    kpis: DeploymentKpis;
}) {
    const { workspace } = usePage<PageProps>().props;

    return (
        <AuthenticatedLayout header="Déploiements">
            <Head title="Déploiements" />

            <div className="premium-list-hero">
                <div>
                    <div className="premium-list-eyebrow">Application</div>
                    <Title level={2} style={{ margin: 0 }}>
                        Déploiements
                    </Title>
                    <Paragraph type="secondary" style={{ margin: '6px 0 0' }}>
                        Chaque exécution est présentée avec sa cible, sa source et son état pour une lecture immédiate.
                    </Paragraph>
                </div>
            </div>

            <DeploymentsList
                searchUrl={route('deployments.search', [workspace!.slug, application.slug])}
                initialItems={deployments.data}
                initialKpis={kpis}
                getRowHref={(deployment) => route('deployments.show', [workspace!.slug, application.slug, deployment.id])}
            />
        </AuthenticatedLayout>
    );
}
