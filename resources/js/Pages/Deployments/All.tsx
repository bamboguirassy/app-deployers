import DeploymentsList from '@/Components/Deployments/DeploymentsList';
import { DeploymentKpis } from '@/constants/deployments';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { Deployment } from '@/types/models';
import { Head, usePage } from '@inertiajs/react';
import { Typography } from 'antd';

const { Title, Paragraph } = Typography;

export default function All({ deployments, kpis }: { deployments: { data: Deployment[] }; kpis: DeploymentKpis }) {
    const { workspace } = usePage<PageProps>().props;

    return (
        <AuthenticatedLayout header="Déploiements">
            <Head title="Déploiements" />

            <div className="premium-list-hero">
                <div>
                    <div className="premium-list-eyebrow">Vue globale</div>
                    <Title level={2} style={{ margin: 0 }}>
                        Déploiements
                    </Title>
                    <Paragraph type="secondary" style={{ margin: '6px 0 0' }}>
                        Un historique global pour parcourir l’ensemble des exécutions, avec la même hiérarchie visuelle.
                    </Paragraph>
                </div>
            </div>

            <DeploymentsList
                searchUrl={route('deployments.all.search', workspace!.slug)}
                initialItems={deployments.data}
                initialKpis={kpis}
                showApplicationColumn
                getRowHref={(deployment) =>
                    route('deployments.show', [workspace!.slug, deployment.target_environment.target.application!.slug, deployment.id])
                }
            />
        </AuthenticatedLayout>
    );
}
