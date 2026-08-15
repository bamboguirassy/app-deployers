import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { Head } from '@inertiajs/react';
import { Card, Space } from 'antd';
import { useTranslation } from 'react-i18next';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';

export default function Edit({
    mustVerifyEmail,
    status,
}: PageProps<{ mustVerifyEmail: boolean; status?: string }>) {
    const { t } = useTranslation('profile');

    return (
        <AuthenticatedLayout header={t('edit.headerTitle')}>
            <Head title={t('edit.pageTitle')} />

            <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <Card>
                    <UpdateProfileInformationForm
                        mustVerifyEmail={mustVerifyEmail}
                        status={status}
                    />
                </Card>

                <Card>
                    <UpdatePasswordForm />
                </Card>

                <Card>
                    <DeleteUserForm />
                </Card>
            </Space>
        </AuthenticatedLayout>
    );
}
