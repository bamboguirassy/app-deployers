import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import MembersList, { MembersListHandle } from '@/Components/Applications/MembersList';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { MembersKpis, ROLE_COLORS } from '@/constants/members';
import { ApplicationMember, PageProps } from '@/types';
import { Application } from '@/types/models';
import { useConfirm } from '@/theme/ConfirmContext';
import { router, useForm, usePage } from '@inertiajs/react';
import { Modal, Tag } from 'antd';
import { Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { FormEventHandler, useRef, useState } from 'react';

export default function MembersPanel({
    application,
    members,
    kpis,
    canManage,
}: {
    application: Application;
    members: ApplicationMember[];
    kpis: MembersKpis;
    canManage: boolean;
}) {
    const { workspace } = usePage<PageProps>().props;
    const listRef = useRef<MembersListHandle>(null);
    const [inviting, setInviting] = useState(false);
    const confirm = useConfirm();
    const { data, setData, post, processing, errors, reset } = useForm({ email: '' });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('members.store', [workspace!.slug, application.slug]), {
            onSuccess: () => {
                reset();
                setInviting(false);
                listRef.current?.refresh();
            },
        });
    };

    const removeMember = (member: ApplicationMember) => {
        confirm.confirm({
            title: `Retirer l'accès de ${member.name} à cette application ?`,
            okText: 'Retirer',
            okType: 'danger',
            cancelText: 'Annuler',
            onOk: () =>
                router.delete(route('members.destroy', [workspace!.slug, application.slug, member.uuid]), {
                    onSuccess: () => listRef.current?.refresh(),
                }),
        });
    };

    return (
        <div className="application-members-panel application-resource-panel">
            <div className="application-resource-header">
                <div>
                    <h3>Membres</h3>
                    <span>Accès à l’application et responsabilités de l’équipe</span>
                </div>
                <div className="application-resource-header__actions">
                    <ShieldCheck size={18} aria-hidden="true" />
            {canManage && (
                    <PrimaryButton size="small" onClick={() => setInviting(true)} icon={<Plus size={14} />}>
                        Donner accès à un membre
                    </PrimaryButton>
            )}
                </div>
            </div>

            <MembersList
                ref={listRef}
                searchUrl={route('members.search', [workspace!.slug, application.slug])}
                initialItems={members}
                initialKpis={kpis}
                renderRole={(member) => (member.role ? <Tag color={ROLE_COLORS[member.role]}>{member.role}</Tag> : '—')}
                renderActions={
                    canManage
                        ? (member) => (
                              <a onClick={() => removeMember(member)}>
                                  <Trash2 size={14} />
                              </a>
                          )
                        : undefined
                }
            />

            <Modal
                title="Donner accès à un membre du workspace"
                open={inviting}
                onCancel={() => setInviting(false)}
                footer={null}
                destroyOnClose
            >
                <form onSubmit={submit} className="form-stack">
                    <div>
                        <InputLabel htmlFor="email" value="Email" />
                        <TextInput
                            id="email"
                            type="email"
                            className="w-full"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder="collegue@exemple.com"
                            isFocused
                            required
                        />
                        <InputError message={errors.email} />
                        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                            Doit déjà être membre du workspace. Son rôle (owner, manager, deployer,
                            viewer) est géré depuis la page Utilisateurs du workspace.
                        </span>
                    </div>

                    <div className="form-actions form-actions--end">
                        <PrimaryButton disabled={processing}>Donner accès</PrimaryButton>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
