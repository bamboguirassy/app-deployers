import SecondaryButton from '@/Components/SecondaryButton';
import { Server } from '@/types/models';
import axios from 'axios';
import { Alert, Modal, Spin } from 'antd';
import { RefreshCcw } from 'lucide-react';
import { useEffect, useState } from 'react';

interface TestResult {
    success: boolean;
    message: string;
    latency_ms: number | null;
}

export default function TestConnectionModal({
    workspaceSlug,
    server,
    onClose,
}: {
    workspaceSlug: string;
    server: Server | null;
    onClose: () => void;
}) {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<TestResult | null>(null);

    const runTest = () => {
        if (!server) return;

        setLoading(true);
        setResult(null);

        axios
            .post(route('servers.test-existing', [workspaceSlug, server.id]))
            .then((res) => setResult(res.data))
            .catch((err) =>
                setResult(err.response?.data ?? { success: false, message: 'Erreur inattendue lors du test.', latency_ms: null }),
            )
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        if (server) {
            runTest();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [server]);

    return (
        <Modal
            title={server ? `Tester la connexion — ${server.name}` : 'Tester la connexion'}
            open={!!server}
            onCancel={onClose}
            footer={
                <div className="form-actions form-actions--end">
                    <SecondaryButton htmlType="button" icon={<RefreshCcw size={14} />} onClick={runTest} disabled={loading}>
                        Relancer le test
                    </SecondaryButton>
                    <SecondaryButton htmlType="button" onClick={onClose}>
                        Fermer
                    </SecondaryButton>
                </div>
            }
            destroyOnClose
        >
            {server && (
                <p className="section-hint" style={{ marginTop: 0 }}>
                    {server.username}@{server.host}:{server.port}
                </p>
            )}

            {loading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 0' }}>
                    <Spin size="small" />
                    <span>Connexion en cours...</span>
                </div>
            )}

            {!loading && result && (
                <Alert
                    type={result.success ? 'success' : 'error'}
                    showIcon
                    message={result.message}
                    description={result.success && result.latency_ms !== null ? `Temps de réponse : ${result.latency_ms} ms` : undefined}
                />
            )}
        </Modal>
    );
}
