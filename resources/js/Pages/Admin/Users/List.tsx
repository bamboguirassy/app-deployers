import AdminUsersList, { AdminUserKpis } from '@/Components/Admin/AdminUsersList';
import AdminLayout from '@/Layouts/AdminLayout';
import { User } from '@/types';
import { Head } from '@inertiajs/react';
import { Typography } from 'antd';
import { useTranslation } from 'react-i18next';

const { Title, Paragraph } = Typography;

export default function List({
    users,
    kpis,
}: {
    users: { data: User[] };
    kpis: AdminUserKpis;
}) {
    const { t } = useTranslation('admin');

    return (
        <AdminLayout breadcrumbs={[{ label: t('layout.breadcrumbFallback'), href: route('admin.dashboard') }, { label: t('layout.nav.users') }]}>
            <Head title={t('usersList.title')} />

            <div className="premium-list-hero">
                <div>
                    <div className="premium-list-eyebrow">{t('usersList.eyebrow')}</div>
                    <Title level={2} style={{ margin: 0 }}>
                        {t('usersList.heading')}
                    </Title>
                    <Paragraph type="secondary" style={{ margin: '6px 0 0' }}>
                        {t('usersList.subtitle')}
                    </Paragraph>
                </div>
            </div>

            <AdminUsersList searchUrl={route('admin.users.search')} initialItems={users.data} initialKpis={kpis} />
        </AdminLayout>
    );
}
