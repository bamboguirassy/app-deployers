import WorkspacesList, { WorkspaceKpis } from '@/Components/Admin/WorkspacesList';
import AdminLayout from '@/Layouts/AdminLayout';
import { AdminWorkspace } from '@/types';
import { Head } from '@inertiajs/react';
import { Typography } from 'antd';
import { useTranslation } from 'react-i18next';

const { Title, Paragraph } = Typography;

export default function List({
    workspaces,
    kpis,
}: {
    workspaces: { data: AdminWorkspace[] };
    kpis: WorkspaceKpis;
}) {
    const { t } = useTranslation('admin');

    return (
        <AdminLayout breadcrumbs={[{ label: t('layout.breadcrumbFallback'), href: route('admin.dashboard') }, { label: t('layout.nav.workspaces') }]}>
            <Head title={t('workspacesList.title')} />

            <div className="premium-list-hero">
                <div>
                    <div className="premium-list-eyebrow">{t('workspacesList.eyebrow')}</div>
                    <Title level={2} style={{ margin: 0 }}>
                        {t('workspacesList.heading')}
                    </Title>
                    <Paragraph type="secondary" style={{ margin: '6px 0 0' }}>
                        {t('workspacesList.subtitle')}
                    </Paragraph>
                </div>
            </div>

            <WorkspacesList
                searchUrl={route('admin.workspaces.search')}
                initialItems={workspaces.data}
                initialKpis={kpis}
                getRowHref={(workspace) => route('admin.workspaces.show', workspace.slug)}
            />
        </AdminLayout>
    );
}
