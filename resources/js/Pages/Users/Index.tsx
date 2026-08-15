import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import UsersList, { UserKpis, UsersListHandle } from '@/Components/Users/UsersList';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { getRoleOptions } from '@/constants/members';
import { PageProps, User } from '@/types';
import { Head, useForm, usePage } from '@inertiajs/react';
import { Modal, Select, Typography } from 'antd';
import { Plus } from 'lucide-react';
import { FormEventHandler, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const { Text, Title, Paragraph } = Typography;

export default function Index({
    users,
    kpis,
    canManage,
}: {
    users: { data: User[] };
    kpis: UserKpis;
    canManage: boolean;
}) {
    const { t } = useTranslation('users');
    const { workspace } = usePage<PageProps>().props;
    const listRef = useRef<UsersListHandle>(null);
    const [creating, setCreating] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        role: 'viewer',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('users.store', workspace!.slug), {
            onSuccess: () => {
                reset();
                setCreating(false);
                listRef.current?.refresh();
            },
        });
    };

    return (
        <AuthenticatedLayout header={t('index.pageTitle')}>
            <Head title={t('index.pageTitle')} />

            <div className="premium-list-hero">
                <div>
                    <div className="premium-list-eyebrow">{t('index.eyebrow')}</div>
                    <Title level={2} style={{ margin: 0 }}>
                        {t('index.heading')}
                    </Title>
                    <Paragraph type="secondary" style={{ margin: '6px 0 0' }}>
                        {t('index.description')}
                    </Paragraph>
                </div>

                {canManage && (
                    <PrimaryButton className="premium-list-hero__action" onClick={() => setCreating(true)} icon={<Plus size={14} />}>
                        {t('index.inviteMember')}
                    </PrimaryButton>
                )}
            </div>

            <UsersList
                ref={listRef}
                searchUrl={route('users.search', workspace!.slug)}
                initialItems={users.data}
                initialKpis={kpis}
                getRowHref={(user) => route('users.show', [workspace!.slug, user.uuid])}
            />

            <Modal
                title={t('index.modal.title')}
                open={creating}
                onCancel={() => setCreating(false)}
                footer={null}
                destroyOnClose
            >
                <form onSubmit={submit} className="form-stack">
                    <div>
                        <InputLabel htmlFor="name" value={t('index.modal.nameLabel')} />
                        <TextInput
                            id="name"
                            className="w-full"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            isFocused
                        />
                        <InputError message={errors.name} />
                    </div>
                    <div>
                        <InputLabel htmlFor="email" value={t('index.modal.emailLabel')} />
                        <TextInput
                            id="email"
                            type="email"
                            className="w-full"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            required
                        />
                        <InputError message={errors.email} />
                    </div>
                    <div>
                        <InputLabel value={t('index.modal.roleLabel')} />
                        <Select className="w-full" value={data.role} onChange={(value) => setData('role', value)} options={getRoleOptions(t)} />
                        <InputError message={errors.role} />
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {t('index.modal.noAccountNotice')}
                    </Text>
                    <div className="form-actions form-actions--end">
                        <PrimaryButton disabled={processing}>{t('index.modal.submit')}</PrimaryButton>
                    </div>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}
