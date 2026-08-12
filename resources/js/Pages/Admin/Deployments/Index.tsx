import DeploymentsMonitor, { AdminDeploymentMonitorKpis } from '@/Components/Admin/DeploymentsMonitor';
import AdminLayout from '@/Layouts/AdminLayout';
import { Deployment } from '@/types/models';
import { Head } from '@inertiajs/react';
import { Typography } from 'antd';

const { Title, Paragraph } = Typography;

export default function Index({
    deployments,
    kpis,
}: {
    deployments: { data: Deployment[] };
    kpis: AdminDeploymentMonitorKpis;
}) {
    return (
        <AdminLayout
            breadcrumbs={[{ label: 'Administration', href: route('admin.dashboard') }, { label: 'Déploiements' }]}
        >
            <Head title="Administration — Déploiements" />

            <div className="premium-list-hero">
                <div>
                    <div className="premium-list-eyebrow">Monitoring plateforme</div>
                    <Title level={2} style={{ margin: 0 }}>
                        Déploiements
                    </Title>
                    <Paragraph type="secondary" style={{ margin: '6px 0 0' }}>
                        Tous les déploiements, tous workspaces confondus, pour repérer et investiguer les échecs. Vue
                        lecture seule.
                    </Paragraph>
                </div>
            </div>

            <DeploymentsMonitor
                searchUrl={route('admin.deployments.search')}
                initialItems={deployments.data as never}
                initialKpis={kpis}
            />
        </AdminLayout>
    );
}
