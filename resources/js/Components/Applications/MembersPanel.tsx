import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import MembersList, { MembersListHandle } from '@/Components/Applications/MembersList';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { MembersKpis, ROLE_COLORS, getRoleLabel, getRoleOptions } from '@/constants/members';
import { ApplicationMember, PageProps } from '@/types';
import { Application } from '@/types/models';
import { useConfirm } from '@/theme/ConfirmContext';
import { router, useForm, usePage } from '@inertiajs/react';
import { Modal, Select, Tag, Tooltip } from 'antd';
import { Info, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { FormEventHandler, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

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
    const { t } = useTranslation('applications');
    const { workspace } = usePage<PageProps>().props;
    const listRef = useRef<MembersListHandle>(null);
    const [inviting, setInviting] = useState(false);
    const confirm = useConfirm();
    const { data, setData, post, processing, errors, reset } = useForm({ email: '', role: 'viewer' as string });

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

    const changeRole = (member: ApplicationMember, role: string) => {
        if (role === member.role) return;
        confirm.confirm({
            title: t('membersPanel.confirmRoleChange.title', { name: member.name }),
            content: t('membersPanel.confirmRoleChange.content', { name: member.name, role: getRoleLabel(t, role) }),
            okText: t('membersPanel.confirmRoleChange.okText'),
            cancelText: t('membersPanel.confirmRoleChange.cancelText'),
            onOk: () =>
                router.patch(
                    route('members.update-role', [workspace!.slug, application.slug, member.uuid]),
                    { role },
                    { preserveScroll: true, onSuccess: () => listRef.current?.refresh() },
                ),
        });
    };

    const removeMember = (member: ApplicationMember) => {
        confirm.confirm({
            title: t('membersPanel.confirmRemove.title', { name: member.name }),
            okText: t('membersPanel.confirmRemove.okText'),
            okType: 'danger',
            cancelText: t('membersPanel.confirmRemove.cancelText'),
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
                    <h3>{t('membersPanel.title')}</h3>
                    <span>{t('membersPanel.subtitle')}</span>
                </div>
                <div className="application-resource-header__actions">
                    <ShieldCheck size={18} aria-hidden="true" />
            {canManage && (
                    <PrimaryButton size="small" onClick={() => setInviting(true)} icon={<Plus size={14} />}>
                        {t('membersPanel.grantAccess')}
                    </PrimaryButton>
            )}
                </div>
            </div>

            <MembersList
                ref={listRef}
                searchUrl={route('members.search', [workspace!.slug, application.slug])}
                initialItems={members}
                initialKpis={kpis}
                renderRole={(member) =>
                    canManage && member.role ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <Select
                                value={member.role}
                                onChange={(role) => changeRole(member, role)}
                                options={getRoleOptions(t)}
                                size="small"
                                style={{ minWidth: 140 }}
                                popupMatchSelectWidth={false}
                            />
                            <Tooltip title={t('membersPanel.roleTooltip')}>
                                <Info size={14} color="var(--color-text-muted)" aria-label={t('membersPanel.roleTooltip')} />
                            </Tooltip>
                        </span>
                    ) : member.role ? (
                        <Tag color={ROLE_COLORS[member.role]}>{getRoleLabel(t, member.role)}</Tag>
                    ) : (
                        '—'
                    )
                }
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
                title={t('membersPanel.modalTitle')}
                open={inviting}
                onCancel={() => setInviting(false)}
                footer={null}
                destroyOnClose
            >
                <form onSubmit={submit} className="form-stack">
                    <div>
                        <InputLabel htmlFor="email" value={t('membersPanel.emailLabel')} />
                        <TextInput
                            id="email"
                            type="email"
                            className="w-full"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder={t('membersPanel.emailPlaceholder')}
                            isFocused
                            required
                        />
                        <InputError message={errors.email} />
                    </div>

                    <div>
                        <InputLabel value={t('membersPanel.roleLabel')} />
                        <Select
                            value={data.role}
                            onChange={(v) => setData('role', v)}
                            options={getRoleOptions(t)}
                            style={{ width: '100%', marginTop: 4 }}
                        />
                        <span style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4, display: 'block' }}>
                            {t('membersPanel.roleHint')}
                        </span>
                    </div>

                    <div className="form-actions form-actions--end">
                        <PrimaryButton disabled={processing}>{t('membersPanel.submit')}</PrimaryButton>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
