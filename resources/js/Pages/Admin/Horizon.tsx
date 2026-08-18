import AdminLayout from '@/Layouts/AdminLayout';
import { Head } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

export default function Horizon() {
    const { t } = useTranslation('admin');

    return (
        <AdminLayout
            breadcrumbs={[
                { label: t('layout.breadcrumbFallback'), href: route('admin.dashboard') },
                { label: t('layout.nav.horizon') },
            ]}
        >
            <Head title="Horizon" />

            <iframe
                src="/horizon"
                title="Horizon"
                style={{
                    width: '100%',
                    height: 'calc(100vh - 3px - 56px)',
                    border: 'none',
                    display: 'block',
                }}
            />
        </AdminLayout>
    );
}
