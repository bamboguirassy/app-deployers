import DeploymentsList from '@/Components/Deployments/DeploymentsList';
import { DeploymentKpis } from '@/constants/deployments';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { Application, Deployment } from '@/types/models';
import { Head, usePage } from '@inertiajs/react';
import { Typography } from 'antd';
import { useTranslation } from 'react-i18next';

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
    const { t } = useTranslation('deployments');

    return (
        <AuthenticatedLayout header={t('index.header')}>
            <Head title={t('index.title')} />

            <div className="premium-list-hero">
                <div>
                    <div className="premium-list-eyebrow">{t('index.eyebrow')}</div>
                    <Title level={2} style={{ margin: 0 }}>
                        {t('index.title')}
                    </Title>
                    <Paragraph type="secondary" style={{ margin: '6px 0 0' }}>
                        {t('index.description')}
                    </Paragraph>
                </div>
            </div>

            <DeploymentsList
                searchUrl={route('deployments.search', [workspace!.slug, application.slug])}
                initialItems={deployments.data}
                initialKpis={kpis}
                getRowHref={(deployment) => route('deployments.show', [workspace!.slug, application.slug, deployment.uuid])}
            />
        </AuthenticatedLayout>
    );
}
