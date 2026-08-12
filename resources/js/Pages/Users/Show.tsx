import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { ROLE_COLORS, ROLE_OPTIONS } from '@/constants/members';
import { useConfirm } from '@/theme/ConfirmContext';
import { ActivityLogEntry, ApplicationAccess, PageProps, User } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { Card, Empty, Select, Space, Tag, Timeline, Typography } from 'antd';
import { ChevronLeft, KeyRound, Mail, ShieldCheck, ShieldOff, UserCog, UserX } from 'lucide-react';
import { FormEventHandler } from 'react';

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
    const { workspace } = usePage<PageProps>().props;
    const confirm = useConfirm();
    const { data, setData, patch, processing } = useForm({ role });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        patch(route('users.update', [workspace!.slug, user.uuid]));
    };

    const resendVerification = () =>
        confirm.confirm({
            title: "Renvoyer l'email de vérification ?",
            content: `Un nouvel email de vérification sera envoyé à ${user.email}.`,
            okText: 'Envoyer',
            cancelText: 'Annuler',
            onOk: () => router.post(route('users.resend-verification', [workspace!.slug, user.uuid])),
        });

    const sendPasswordReset = () =>
        confirm.confirm({
            title: 'Réinitialiser le mot de passe ?',
            content: `Un email avec un lien de réinitialisation sera envoyé à ${user.email}.`,
            okText: 'Envoyer',
            cancelText: 'Annuler',
            onOk: () => router.post(route('users.send-password-reset', [workspace!.slug, user.uuid])),
        });

    const toggleSuspend = () =>
        confirm.confirm({
            title: user.suspended_at ? 'Réactiver ce compte ?' : 'Suspendre ce compte ?',
            content: user.suspended_at
                ? "L'utilisateur pourra de nouveau se connecter."
                : 'L\'utilisateur ne pourra plus se connecter tant que le compte est suspendu.',
            okText: user.suspended_at ? 'Réactiver' : 'Suspendre',
            okType: user.suspended_at ? 'primary' : 'danger',
            cancelText: 'Annuler',
            onOk: () => router.post(route('users.toggle-suspend', [workspace!.slug, user.uuid])),
        });

    const removeFromWorkspace = () =>
        confirm.confirm({
            title: `Retirer ${user.name} du workspace ?`,
            content: "Il perdra son rôle et l'accès à toutes les applications de ce workspace. Son compte n'est pas supprimé.",
            okText: 'Retirer',
            okType: 'danger',
            cancelText: 'Annuler',
            onOk: () => router.delete(route('users.destroy', [workspace!.slug, user.uuid])),
        });

    return (
        <AuthenticatedLayout header="Membre du workspace">
            <Head title={user.name} />

            <Link href={route('users.index', workspace!.slug)} className="form-link">
                <Space size={4}>
                    <ChevronLeft size={14} />
                    Tous les membres
                </Space>
            </Link>

            <div style={{ margin: '12px 0 24px' }}>
                <Title level={4} style={{ margin: 0 }}>
                    {user.name}
                </Title>
                <Text type="secondary">{user.email}</Text>
                <Tag color={ROLE_COLORS[role]} style={{ marginLeft: 8 }}>
                    {role}
                </Tag>
                {user.suspended_at && (
                    <Tag color="red" style={{ marginLeft: 8 }}>
                        Suspendu
                    </Tag>
                )}
            </div>

            <Space direction="vertical" size={16} style={{ width: '100%' }}>
                {canManage && !isSelf && (
                    <Card title="Rôle dans le workspace">
                        <form onSubmit={submit} className="form-stack" style={{ maxWidth: 360 }}>
                            <Select value={data.role} onChange={(value) => setData('role', value)} options={ROLE_OPTIONS} />
                            <div className="form-actions" style={{ justifyContent: 'flex-start' }}>
                                <PrimaryButton disabled={processing || data.role === role}>Enregistrer</PrimaryButton>
                            </div>
                        </form>
                    </Card>
                )}

                {canManage && !isSelf && (
                    <Card title="Actions">
                        <Space wrap>
                            <SecondaryButton icon={<Mail size={14} />} onClick={resendVerification}>
                                Renvoyer l&apos;email de vérification
                            </SecondaryButton>
                            <SecondaryButton icon={<KeyRound size={14} />} onClick={sendPasswordReset}>
                                Réinitialiser le mot de passe
                            </SecondaryButton>
                            <SecondaryButton
                                danger={!user.suspended_at}
                                icon={user.suspended_at ? <ShieldCheck size={14} /> : <ShieldOff size={14} />}
                                onClick={toggleSuspend}
                            >
                                {user.suspended_at ? 'Réactiver le compte' : 'Suspendre le compte'}
                            </SecondaryButton>
                            <SecondaryButton danger icon={<UserX size={14} />} onClick={removeFromWorkspace}>
                                Retirer du workspace
                            </SecondaryButton>
                        </Space>
                    </Card>
                )}

                <Card
                    title={
                        <Space>
                            <UserCog size={16} />
                            Applications
                        </Space>
                    }
                >
                    {applications.length === 0 ? (
                        <Text type="secondary">Aucun accès à une application pour le moment.</Text>
                    ) : (
                        <Space size={8} wrap>
                            {applications.map((a) => (
                                <Tag key={a.application_slug}>{a.application_name}</Tag>
                            ))}
                        </Space>
                    )}
                </Card>

                <Card title="Activité récente">
                    {activity.length === 0 ? (
                        <Empty description="Aucune activité" />
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
                                            {new Date(entry.created_at).toLocaleString('fr-FR')}
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
