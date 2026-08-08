import { Server } from '@/types/models';
import axios from 'axios';
import { Alert, Breadcrumb, Empty, Modal, Spin } from 'antd';
import { Folder, FolderOpen } from 'lucide-react';
import { useEffect, useState } from 'react';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';

interface DirectoryEntry {
    name: string;
    path: string;
}

export default function DirectoryBrowserModal({
    workspaceSlug,
    server,
    initialPath,
    open,
    onClose,
    onSelect,
}: {
    workspaceSlug: string;
    server: Server | null;
    initialPath?: string;
    open: boolean;
    onClose: () => void;
    onSelect: (path: string) => void;
}) {
    const [path, setPath] = useState('/');
    const [entries, setEntries] = useState<DirectoryEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = (targetPath: string) => {
        if (!server) return;

        setLoading(true);
        setError(null);
        axios
            .post(route('servers.browse-directory', [workspaceSlug, server.id]), { path: targetPath })
            .then((res) => {
                setPath(res.data.path);
                setEntries(res.data.entries);
            })
            .catch((err) => setError(err.response?.data?.message ?? 'Impossible de parcourir ce dossier.'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        if (open && server) {
            load(initialPath && initialPath.trim() !== '' ? initialPath : '/');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, server]);

    const segments = path.split('/').filter(Boolean);
    const breadcrumbItems = [
        { title: '/', onClick: () => load('/') },
        ...segments.map((segment, index) => ({
            title: segment,
            onClick: () => load('/'.concat(segments.slice(0, index + 1).join('/'))),
        })),
    ].map((item) => ({
        title: (
            <a onClick={item.onClick} style={{ cursor: 'pointer' }}>
                {item.title}
            </a>
        ),
    }));

    return (
        <Modal
            title={server ? `Parcourir ${server.name}` : 'Parcourir'}
            open={open}
            onCancel={onClose}
            width={560}
            footer={
                <div className="form-actions form-actions--end">
                    <SecondaryButton htmlType="button" onClick={onClose}>
                        Annuler
                    </SecondaryButton>
                    <PrimaryButton
                        htmlType="button"
                        icon={<FolderOpen size={14} />}
                        onClick={() => {
                            onSelect(path);
                            onClose();
                        }}
                        disabled={loading || !!error}
                    >
                        Sélectionner ce dossier
                    </PrimaryButton>
                </div>
            }
            destroyOnClose
        >
            <div style={{ marginBottom: 12 }}>
                <Breadcrumb items={breadcrumbItems} />
            </div>

            {loading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '24px 0' }}>
                    <Spin size="small" />
                    <span>Chargement du contenu du dossier...</span>
                </div>
            )}

            {!loading && error && <Alert type="error" showIcon message={error} />}

            {!loading && !error && entries.length === 0 && <Empty description="Aucun sous-dossier ici" />}

            {!loading && !error && entries.length > 0 && (
                <div className="directory-browser-list">
                    {entries.map((entry) => (
                        <button key={entry.path} type="button" className="directory-browser-item" onClick={() => load(entry.path)}>
                            <Folder size={16} />
                            {entry.name}
                        </button>
                    ))}
                </div>
            )}
        </Modal>
    );
}
