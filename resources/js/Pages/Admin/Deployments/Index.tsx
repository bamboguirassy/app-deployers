import DeploymentsMonitor, { AdminDeploymentMonitorKpis } from '@/Components/Admin/DeploymentsMonitor';
import AdminLayout from '@/Layouts/AdminLayout';
import { Deployment } from '@/types/models';
import { Head } from '@inertiajs/react';
import { Typography } from 'antd';
import { useTranslation } from 'react-i18next';

const { Title, Paragraph } = Typography;

export default function Index({
    deployments,
    kpis,
}: {
    deployments: { data: Deployment[] };
    kpis: AdminDeploymentMonitorKpis;
}) {
    const { t } = useTranslation('admin');

    return (
        <AdminLayout
            breadcrumbs={[{ label: t('layout.breadcrumbFallback'), href: route('admin.dashboard') }, { label: t('layout.nav.deployments') }]}
        >
            <Head title={t('deploymentsIndex.title')} />

            <div className="premium-list-hero">
                <div>
                    <div className="premium-list-eyebrow">{t('deploymentsIndex.eyebrow')}</div>
                    <Title level={2} style={{ margin: 0 }}>
                        {t('deploymentsIndex.heading')}
                    </Title>
                    <Paragraph type="secondary" style={{ margin: '6px 0 0' }}>
                        {t('deploymentsIndex.subtitle')}
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
