import AdminUsersList, { AdminUserKpis } from '@/Components/Admin/AdminUsersList';
import AdminLayout from '@/Layouts/AdminLayout';
import { User } from '@/types';
import { Head } from '@inertiajs/react';
import { Typography } from 'antd';

const { Title, Paragraph } = Typography;

export default function List({
    users,
    kpis,
}: {
    users: { data: User[] };
    kpis: AdminUserKpis;
}) {
    return (
        <AdminLayout breadcrumbs={[{ label: 'Administration', href: route('admin.dashboard') }, { label: 'Utilisateurs' }]}>
            <Head title="Administration — Utilisateurs" />

            <div className="premium-list-hero">
                <div>
                    <div className="premium-list-eyebrow">Plateforme</div>
                    <Title level={2} style={{ margin: 0 }}>
                        Utilisateurs
                    </Title>
                    <Paragraph type="secondary" style={{ margin: '6px 0 0' }}>
                        Tous les utilisateurs de la plateforme, tous workspaces confondus. Promouvez ou rétrogradez les droits
                        super-admin ici.
                    </Paragraph>
                </div>
            </div>

            <AdminUsersList searchUrl={route('admin.users.search')} initialItems={users.data} initialKpis={kpis} />
        </AdminLayout>
    );
}
