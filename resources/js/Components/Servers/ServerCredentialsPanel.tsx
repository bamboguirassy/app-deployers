import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import { useConfirm } from '@/theme/ConfirmContext';
import { Server, ServerCredential } from '@/types/models';
import axios from 'axios';
import { Alert, Input, Radio, Tag } from 'antd';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Comptes FTP/SFTP dédiés d'un serveur (ServerCredential) — indépendants de
 * son éventuel SSH principal. Affiché uniquement en édition (un serveur pas
 * encore créé n'a pas d'id à rattacher). Voir App\Http\Controllers\
 * ServerCredentialController et le choix du compte par TargetEnvironment
 * dans PipelineStepsPanel/EnvironmentWorkspace.
 *
 * En axios (pas Inertia router) — ServersList.tsx gère déjà sa propre liste
 * en state local via axios (useListSearch), donc ce panneau met à jour le
 * même état via `onChange` plutôt que de déclencher une navigation Inertia
 * complète qui romprait ce pattern.
 */
export default function ServerCredentialsPanel({
    workspaceSlug,
    server,
    onChange,
}: {
    workspaceSlug: string;
    server: Server;
    onChange: (credentials: ServerCredential[]) => void;
}) {
    const { t } = useTranslation('servers');
    const confirm = useConfirm();
    const [adding, setAdding] = useState(false);
    const [editing, setEditing] = useState<ServerCredential | null>(null);
    const [type, setType] = useState<'ftp' | 'sftp'>('ftp');
    const [label, setLabel] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [privateKey, setPrivateKey] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const credentials = server.credentials ?? [];

    const openCreate = () => {
        setEditing(null);
        setType('ftp');
        setLabel('');
        setUsername('');
        setPassword('');
        setPrivateKey('');
        setAdding(true);
    };

    const openEdit = (credential: ServerCredential) => {
        setEditing(credential);
        setType(credential.type);
        setLabel(credential.label);
        setUsername(credential.username);
        setPassword('');
        setPrivateKey('');
        setAdding(true);
    };

    const submit = () => {
        setSubmitting(true);
        setError(null);

        const data = { type, label, username, password, private_key: privateKey };
        const request = editing
            ? axios.patch(route('server-credentials.update', [workspaceSlug, server.uuid, editing.uuid]), data)
            : axios.post(route('server-credentials.store', [workspaceSlug, server.uuid]), data);

        request
            .then((res) => {
                const saved = res.data as ServerCredential;
                onChange(
                    editing
                        ? credentials.map((c) => (c.id === saved.id ? saved : c))
                        : [...credentials, saved],
                );
                setAdding(false);
            })
            .catch((err) => setError(err.response?.data?.message ?? t('form.unexpectedError')))
            .finally(() => setSubmitting(false));
    };

    const destroy = (credential: ServerCredential) => {
        confirm.confirm({
            title: t('credentials.confirmDelete.title', { label: credential.label }),
            okType: 'danger',
            okText: t('credentials.confirmDelete.okText'),
            cancelText: t('credentials.confirmDelete.cancelText'),
            onOk: () =>
                axios
                    .delete(route('server-credentials.destroy', [workspaceSlug, server.uuid, credential.uuid]))
                    .then(() => onChange(credentials.filter((c) => c.id !== credential.id)))
                    .catch((err) => setError(err.response?.data?.message ?? t('form.unexpectedError'))),
        });
    };

    return (
        <div className="server-credentials-panel">
            <div className="server-credentials-panel__header">
                <span className="step-editor__field-label">{t('credentials.sectionTitle')}</span>
                {!adding && (
                    <SecondaryButton htmlType="button" icon={<Plus size={13} />} onClick={openCreate}>
                        {t('credentials.add')}
                    </SecondaryButton>
                )}
            </div>
            <p className="section-hint" style={{ marginTop: 0 }}>
                {t('credentials.sectionHint')}
            </p>

            {credentials.length === 0 && !adding && <p className="section-hint">{t('credentials.empty')}</p>}

            {credentials.length > 0 && (
                <ul className="server-credentials-panel__list">
                    {credentials.map((credential) => (
                        <li key={credential.id} className="server-credentials-panel__item">
                            <Tag color={credential.type === 'ftp' ? 'orange' : 'blue'}>{credential.type.toUpperCase()}</Tag>
                            <span className="server-credentials-panel__label">{credential.label}</span>
                            <span className="server-credentials-panel__username">{credential.username}</span>
                            <button type="button" onClick={() => openEdit(credential)} className="server-credentials-panel__edit">
                                {t('credentials.edit')}
                            </button>
                            <button
                                type="button"
                                aria-label={t('credentials.confirmDelete.okText')}
                                className="server-credentials-panel__delete"
                                onClick={() => destroy(credential)}
                            >
                                <Trash2 size={13} />
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {adding && (
                // Une <div>, pas un <form> : ce panneau est rendu à l'intérieur du
                // <form> de ServerFormModal — un <form> imbriqué serait invalide en
                // HTML et le navigateur en réattribue le bouton "submit" au form
                // parent, ce qui déclenchait silencieusement la sauvegarde du
                // serveur au lieu de celle du compte FTP/SFTP.
                <div className="form-stack server-credentials-panel__form">
                    {error && <Alert type="error" showIcon message={error} />}
                    <Radio.Group value={type} onChange={(e) => setType(e.target.value)} disabled={!!editing}>
                        <Radio.Button value="ftp">FTP</Radio.Button>
                        <Radio.Button value="sftp">SFTP</Radio.Button>
                    </Radio.Group>

                    <div>
                        <InputLabel value={t('credentials.labelLabel')} />
                        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t('credentials.labelPlaceholder')} autoFocus />
                    </div>
                    <div>
                        <InputLabel value={t('form.usernameLabel')} />
                        <Input value={username} onChange={(e) => setUsername(e.target.value)} />
                    </div>
                    <div>
                        <InputLabel value={t('form.passwordLabel')} />
                        <Input.Password
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={editing ? t('form.passwordPlaceholderEdit') : undefined}
                        />
                    </div>
                    {type === 'sftp' && (
                        <div>
                            <InputLabel value={t('credentials.privateKeyOptionalLabel')} />
                            <Input.TextArea
                                rows={4}
                                className="ssh-key-textarea"
                                value={privateKey}
                                onChange={(e) => setPrivateKey(e.target.value)}
                                placeholder={editing ? t('form.privateKeyPlaceholderEdit') : t('form.privateKeyPlaceholderCreate')}
                            />
                        </div>
                    )}
                    <div className="form-actions form-actions--end">
                        <SecondaryButton htmlType="button" onClick={() => setAdding(false)}>
                            {t('form.cancel')}
                        </SecondaryButton>
                        <PrimaryButton
                            htmlType="button"
                            onClick={submit}
                            disabled={submitting || !label.trim() || !username.trim()}
                            loading={submitting}
                        >
                            {t('credentials.save')}
                        </PrimaryButton>
                    </div>
                </div>
            )}
        </div>
    );
}
