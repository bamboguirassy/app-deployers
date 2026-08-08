import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import { Server } from '@/types/models';
import { useForm } from '@inertiajs/react';
import axios from 'axios';
import { Alert, Input, InputNumber, Modal, Radio } from 'antd';
import { KeyRound, Lock, PlugZap } from 'lucide-react';
import { FormEventHandler, useEffect, useState } from 'react';

interface TestResult {
    success: boolean;
    message: string;
    latency_ms: number | null;
}

export default function ServerFormModal({
    workspaceSlug,
    server,
    open,
    onClose,
}: {
    workspaceSlug: string;
    server?: Server;
    open: boolean;
    onClose: () => void;
}) {
    const isEditing = !!server;

    const { data, setData, post, patch, processing, errors, reset, clearErrors } = useForm({
        name: server?.name ?? '',
        host: server?.host ?? '',
        port: server?.port ?? 22,
        username: server?.username ?? '',
        auth_method: server?.auth_method ?? ('ssh_key' as 'ssh_key' | 'password'),
        password: '',
        private_key: '',
        passphrase: '',
    });

    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<TestResult | null>(null);

    useEffect(() => {
        if (open) {
            clearErrors();
            setTestResult(null);
            setData({
                name: server?.name ?? '',
                host: server?.host ?? '',
                port: server?.port ?? 22,
                username: server?.username ?? '',
                auth_method: server?.auth_method ?? 'ssh_key',
                password: '',
                private_key: '',
                passphrase: '',
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, server]);

    // Toute modification des identifiants invalide un précédent résultat de test.
    useEffect(() => {
        setTestResult(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data.host, data.port, data.username, data.auth_method, data.password, data.private_key, data.passphrase]);

    const testConnection = () => {
        setTesting(true);
        setTestResult(null);

        const payload = {
            host: data.host,
            port: data.port,
            username: data.username,
            auth_method: data.auth_method,
            password: data.password,
            private_key: data.private_key,
            passphrase: data.passphrase,
        };

        const request = isEditing
            ? axios.post(route('servers.test-existing', [workspaceSlug, server.id]), payload)
            : axios.post(route('servers.test-connection', workspaceSlug), payload);

        request
            .then((res) => setTestResult(res.data))
            .catch((err) => setTestResult(err.response?.data ?? { success: false, message: 'Erreur inattendue.', latency_ms: null }))
            .finally(() => setTesting(false));
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        const options = {
            onSuccess: () => {
                reset();
                onClose();
            },
        };

        if (isEditing) {
            patch(route('servers.update', [workspaceSlug, server.id]), options);
        } else {
            post(route('servers.store', workspaceSlug), options);
        }
    };

    const canTest =
        data.host.trim() !== '' &&
        data.username.trim() !== '' &&
        (data.auth_method === 'password' ? data.password.trim() !== '' : data.private_key.trim() !== '');

    return (
        <Modal
            title={isEditing ? 'Modifier le serveur' : 'Ajouter un serveur'}
            open={open}
            onCancel={onClose}
            footer={null}
            destroyOnClose
            width={520}
        >
            <form onSubmit={submit} className="form-stack">
                <div>
                    <InputLabel htmlFor="server-name" value="Nom du serveur" />
                    <Input
                        id="server-name"
                        placeholder="ex: Serveur de production"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        autoFocus
                    />
                    <InputError message={errors.name} />
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ flex: 3 }}>
                        <InputLabel htmlFor="server-host" value="Adresse (IP ou nom d'hôte)" />
                        <Input
                            id="server-host"
                            placeholder="ex: 203.0.113.10"
                            value={data.host}
                            onChange={(e) => setData('host', e.target.value)}
                        />
                        <InputError message={errors.host} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <InputLabel htmlFor="server-port" value="Port" />
                        <InputNumber
                            id="server-port"
                            className="w-full"
                            min={1}
                            max={65535}
                            value={data.port}
                            onChange={(value) => setData('port', value ?? 22)}
                        />
                        <InputError message={errors.port} />
                    </div>
                </div>

                <div>
                    <InputLabel htmlFor="server-username" value="Nom d'utilisateur" />
                    <Input
                        id="server-username"
                        placeholder="ex: deploy"
                        value={data.username}
                        onChange={(e) => setData('username', e.target.value)}
                    />
                    <InputError message={errors.username} />
                </div>

                <div>
                    <InputLabel value="Méthode d'authentification" />
                    <Radio.Group
                        value={data.auth_method}
                        onChange={(e) => setData('auth_method', e.target.value)}
                        style={{ display: 'flex', gap: 8, marginTop: 4 }}
                    >
                        <Radio.Button value="ssh_key" style={{ flex: 1, textAlign: 'center', height: 'auto' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '4px 0' }}>
                                <KeyRound size={13} />
                                Clé SSH
                            </span>
                        </Radio.Button>
                        <Radio.Button value="password" style={{ flex: 1, textAlign: 'center', height: 'auto' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '4px 0' }}>
                                <Lock size={13} />
                                Mot de passe
                            </span>
                        </Radio.Button>
                    </Radio.Group>
                </div>

                {data.auth_method === 'password' ? (
                    <div>
                        <InputLabel htmlFor="server-password" value="Mot de passe" />
                        <Input.Password
                            id="server-password"
                            placeholder={isEditing ? 'Laisser vide pour ne pas modifier' : undefined}
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                        />
                        <InputError message={errors.password} />
                    </div>
                ) : (
                    <>
                        <div>
                            <InputLabel htmlFor="server-private-key" value="Clé privée SSH" />
                            <Input.TextArea
                                id="server-private-key"
                                rows={6}
                                className="ssh-key-textarea"
                                placeholder={
                                    isEditing
                                        ? 'Laisser vide pour ne pas modifier\n-----BEGIN OPENSSH PRIVATE KEY-----\n...'
                                        : '-----BEGIN OPENSSH PRIVATE KEY-----\n...'
                                }
                                value={data.private_key}
                                onChange={(e) => setData('private_key', e.target.value)}
                            />
                            <InputError message={errors.private_key} />
                        </div>
                        <div>
                            <InputLabel htmlFor="server-passphrase" value="Passphrase (optionnel)" />
                            <Input.Password
                                id="server-passphrase"
                                placeholder={isEditing ? 'Laisser vide pour ne pas modifier' : undefined}
                                value={data.passphrase}
                                onChange={(e) => setData('passphrase', e.target.value)}
                            />
                            <InputError message={errors.passphrase} />
                        </div>
                    </>
                )}

                {isEditing && (
                    <p className="section-hint" style={{ margin: 0 }}>
                        Le test utilise les identifiants ci-dessus s&apos;ils sont renseignés, sinon ceux déjà enregistrés pour ce serveur.
                    </p>
                )}

                <div>
                    <SecondaryButton
                        htmlType="button"
                        icon={<PlugZap size={14} />}
                        onClick={testConnection}
                        disabled={!canTest || testing}
                        loading={testing}
                    >
                        Tester la connexion
                    </SecondaryButton>
                </div>

                {testResult && (
                    <Alert
                        type={testResult.success ? 'success' : 'error'}
                        showIcon
                        message={testResult.message}
                        description={
                            testResult.success && testResult.latency_ms !== null
                                ? `Temps de réponse : ${testResult.latency_ms} ms`
                                : undefined
                        }
                    />
                )}

                <div className="form-actions form-actions--end">
                    <SecondaryButton htmlType="button" onClick={onClose}>
                        Annuler
                    </SecondaryButton>
                    <PrimaryButton disabled={processing}>{isEditing ? 'Enregistrer' : 'Ajouter le serveur'}</PrimaryButton>
                </div>
            </form>
        </Modal>
    );
}
