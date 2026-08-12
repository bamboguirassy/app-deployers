import WorkspacesList, { WorkspaceKpis } from '@/Components/Admin/WorkspacesList';
import AdminLayout from '@/Layouts/AdminLayout';
import { AdminWorkspace } from '@/types';
import { Head } from '@inertiajs/react';
import { Typography } from 'antd';

const { Title, Paragraph } = Typography;

export default function List({
    workspaces,
    kpis,
}: {
    workspaces: { data: AdminWorkspace[] };
    kpis: WorkspaceKpis;
}) {
    return (
        <AdminLayout breadcrumbs={[{ label: 'Administration', href: route('admin.dashboard') }, { label: 'Workspaces' }]}>
            <Head title="Administration — Workspaces" />

            <div className="premium-list-hero">
                <div>
                    <div className="premium-list-eyebrow">Plateforme</div>
                    <Title level={2} style={{ margin: 0 }}>
                        Workspaces
                    </Title>
                    <Paragraph type="secondary" style={{ margin: '6px 0 0' }}>
                        Consultez et gérez tous les workspaces créés sur la plateforme.
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
