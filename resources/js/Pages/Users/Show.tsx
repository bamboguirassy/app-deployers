import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { ROLE_COLORS, getRoleLabel, getRoleOptions } from '@/constants/members';
import { useConfirm } from '@/theme/ConfirmContext';
import { ActivityLogEntry, ApplicationAccess, PageProps, User } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { Card, Empty, Select, Space, Tag, Timeline, Typography } from 'antd';
import { ChevronLeft, KeyRound, Mail, ShieldCheck, ShieldOff, UserCog, UserX } from 'lucide-react';
import { FormEventHandler } from 'react';
import { useTranslation } from 'react-i18next';
import { dateLocale } from '@/lib/i18n';

const { Title, Text } = Typography;

export default function Show({
    user,
    role,
    applications,
    activity,
    isSelf,
    canManage,
}: {
    user: User;
    role: 'owner' | 'manager' | 'deployer' | 'viewer';
    applications: ApplicationAccess[];
    activity: ActivityLogEntry[];
    isSelf: boolean;
    canManage: boolean;
}) {
    const { t, i18n } = useTranslation('users');
    const { workspace } = usePage<PageProps>().props;
    const confirm = useConfirm();
    const { data, setData, patch, processing } = useForm({ role });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        patch(route('users.update', [workspace!.slug, user.uuid]));
    };

    const resendVerification = () =>
        confirm.confirm({
            title: t('show.confirms.resendVerification.title'),
            content: t('show.confirms.resendVerification.content', { email: user.email }),
            okText: t('show.confirms.resendVerification.okText'),
            cancelText: t('show.confirms.resendVerification.cancelText'),
            onOk: () => router.post(route('users.resend-verification', [workspace!.slug, user.uuid])),
        });

    const sendPasswordReset = () =>
        confirm.confirm({
            title: t('show.confirms.resetPassword.title'),
            content: t('show.confirms.resetPassword.content', { email: user.email }),
            okText: t('show.confirms.resetPassword.okText'),
            cancelText: t('show.confirms.resetPassword.cancelText'),
            onOk: () => router.post(route('users.send-password-reset', [workspace!.slug, user.uuid])),
        });

    const toggleSuspend = () =>
        confirm.confirm({
            title: user.suspended_at ? t('show.confirms.reactivate.title') : t('show.confirms.suspend.title'),
            content: user.suspended_at ? t('show.confirms.reactivate.content') : t('show.confirms.suspend.content'),
            okText: user.suspended_at ? t('show.confirms.reactivate.okText') : t('show.confirms.suspend.okText'),
            okType: user.suspended_at ? 'primary' : 'danger',
            cancelText: user.suspended_at ? t('show.confirms.reactivate.cancelText') : t('show.confirms.suspend.cancelText'),
            onOk: () => router.post(route('users.toggle-suspend', [workspace!.slug, user.uuid])),
        });

    const removeFromWorkspace = () =>
        confirm.confirm({
            title: t('show.confirms.remove.title', { name: user.name }),
            content: t('show.confirms.remove.content'),
            okText: t('show.confirms.remove.okText'),
            okType: 'danger',
            cancelText: t('show.confirms.remove.cancelText'),
            onOk: () => router.delete(route('users.destroy', [workspace!.slug, user.uuid])),
        });

    return (
        <AuthenticatedLayout header={t('show.pageHeader')}>
            <Head title={user.name} />

            <Link href={route('users.index', workspace!.slug)} className="form-link">
                <Space size={4}>
                    <ChevronLeft size={14} />
                    {t('show.backToAllMembers')}
                </Space>
            </Link>

            <div style={{ margin: '12px 0 24px' }}>
                <Title level={4} style={{ margin: 0 }}>
                    {user.name}
                </Title>
                <Text type="secondary">{user.email}</Text>
                <Tag color={ROLE_COLORS[role]} style={{ marginLeft: 8 }}>
                    {getRoleLabel(t, role)}
                </Tag>
                {user.suspended_at && (
                    <Tag color="red" style={{ marginLeft: 8 }}>
                        {t('show.suspended')}
                    </Tag>
                )}
            </div>

            <Space direction="vertical" size={16} style={{ width: '100%' }}>
                {canManage && !isSelf && (
                    <Card title={t('show.roleCard.title')}>
                        <form onSubmit={submit} className="form-stack" style={{ maxWidth: 360 }}>
                            <Select value={data.role} onChange={(value) => setData('role', value)} options={getRoleOptions(t)} />
                            <div className="form-actions" style={{ justifyContent: 'flex-start' }}>
                                <PrimaryButton disabled={processing || data.role === role}>{t('show.roleCard.save')}</PrimaryButton>
                            </div>
                        </form>
                    </Card>
                )}

                {canManage && !isSelf && (
                    <Card title={t('show.actionsCard.title')}>
                        <Space wrap>
                            <SecondaryButton icon={<Mail size={14} />} onClick={resendVerification}>
                                {t('show.actionsCard.resendVerification')}
                            </SecondaryButton>
                            <SecondaryButton icon={<KeyRound size={14} />} onClick={sendPasswordReset}>
                                {t('show.actionsCard.resetPassword')}
                            </SecondaryButton>
                            <SecondaryButton
                                danger={!user.suspended_at}
                                icon={user.suspended_at ? <ShieldCheck size={14} /> : <ShieldOff size={14} />}
                                onClick={toggleSuspend}
                            >
                                {user.suspended_at ? t('show.actionsCard.reactivateAccount') : t('show.actionsCard.suspendAccount')}
                            </SecondaryButton>
                            <SecondaryButton danger icon={<UserX size={14} />} onClick={removeFromWorkspace}>
                                {t('show.actionsCard.removeFromWorkspace')}
                            </SecondaryButton>
                        </Space>
                    </Card>
                )}

                <Card
                    title={
                        <Space>
                            <UserCog size={16} />
                            {t('show.applicationsCard.title')}
                        </Space>
                    }
                >
                    {applications.length === 0 ? (
                        <Text type="secondary">{t('show.applicationsCard.noAccess')}</Text>
                    ) : (
                        <Space size={8} wrap>
                            {applications.map((a) => (
                                <Tag key={a.application_slug}>{a.application_name}</Tag>
                            ))}
                        </Space>
                    )}
                </Card>

                <Card title={t('show.activityCard.title')}>
                    {activity.length === 0 ? (
                        <Empty description={t('show.activityCard.empty')} />
                    ) : (
                        <Timeline
                            items={activity.map((entry) => ({
                                children: (
                                    <div>
                                        <Text strong>{entry.action}</Text>
                                        {entry.application && (
                                            <Text type="secondary"> · {entry.application.name}</Text>
                                        )}
                                        <br />
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            {new Date(entry.created_at).toLocaleString(dateLocale(i18n.language))}
                                        </Text>
                                    </div>
                                ),
                            }))}
                        />
                    )}
                </Card>
            </Space>
        </AuthenticatedLayout>
    );
}
