import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import UsersList, { UserKpis, UsersListHandle } from '@/Components/Users/UsersList';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { ROLE_OPTIONS } from '@/constants/members';
import { PageProps, User } from '@/types';
import { Head, useForm, usePage } from '@inertiajs/react';
import { Modal, Select, Typography } from 'antd';
import { Plus } from 'lucide-react';
import { FormEventHandler, useRef, useState } from 'react';

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
        <AuthenticatedLayout header="Utilisateurs">
            <Head title="Utilisateurs" />

            <div className="premium-list-hero">
                <div>
                    <div className="premium-list-eyebrow">Workspace</div>
                    <Title level={2} style={{ margin: 0 }}>
                        Membres du workspace
                    </Title>
                    <Paragraph type="secondary" style={{ margin: '6px 0 0' }}>
                        Les accès, rôles et statuts sont regroupés dans une vue claire et rapide à parcourir.
                    </Paragraph>
                </div>

                {canManage && (
                    <PrimaryButton className="premium-list-hero__action" onClick={() => setCreating(true)} icon={<Plus size={14} />}>
                        Inviter un membre
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
                title="Inviter un membre"
                open={creating}
                onCancel={() => setCreating(false)}
                footer={null}
                destroyOnClose
            >
                <form onSubmit={submit} className="form-stack">
                    <div>
                        <InputLabel htmlFor="name" value="Nom" />
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
                        <InputLabel htmlFor="email" value="Email" />
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
                        <InputLabel value="Rôle dans le workspace" />
                        <Select className="w-full" value={data.role} onChange={(value) => setData('role', value)} options={ROLE_OPTIONS} />
                        <InputError message={errors.role} />
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Si cette adresse n&apos;a pas encore de compte, un email lui sera envoyé pour définir son mot de passe.
                    </Text>
                    <div className="form-actions form-actions--end">
                        <PrimaryButton disabled={processing}>Inviter</PrimaryButton>
                    </div>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}
