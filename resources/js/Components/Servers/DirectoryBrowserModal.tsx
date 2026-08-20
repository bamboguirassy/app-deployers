import { Server } from '@/types/models';
import axios from 'axios';
import { Alert, Breadcrumb, Empty, Input, Modal, Spin } from 'antd';
import { Folder, FolderOpen, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';

interface DirectoryEntry {
    name: string;
    path: string;
}

export interface AnonCredentials {
    host: string;
    port: number;
    username: string;
    auth_method: 'password' | 'ssh_key';
    password?: string;
    private_key?: string;
    passphrase?: string;
}

export default function DirectoryBrowserModal({
    workspaceSlug,
    server,
    credentials,
    local,
    initialPath,
    open,
    onClose,
    onSelect,
}: {
    workspaceSlug: string;
    /** Serveur enregistré (mode édition). Mutuellement exclusif avec credentials. */
    server?: Server | null;
    /** Credentials bruts non enregistrés (mode création après test réussi). */
    credentials?: AnonCredentials | null;
    /** Parcourir le système de fichiers local (aucun serveur requis). */
    local?: boolean;
    initialPath?: string;
    open: boolean;
    onClose: () => void;
    onSelect: (path: string) => void;
}) {
    const { t } = useTranslation('servers');
    const [path, setPath] = useState('/');
    const [entries, setEntries] = useState<DirectoryEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    const load = (targetPath: string) => {
        setSearch('');
        setLoading(true);
        setError(null);

        const request = local
            ? axios.post(route('servers.browse-directory-local', workspaceSlug), { path: targetPath })
            : server
              ? axios.post(route('servers.browse-directory', [workspaceSlug, server.uuid]), { path: targetPath })
              : axios.post(route('servers.browse-directory-anon', workspaceSlug), { ...credentials, path: targetPath });

        request
            .then((res) => {
                setPath(res.data.path);
                setEntries(res.data.entries);
            })
            .catch((err) => setError(err.response?.data?.message ?? t('directoryBrowser.loadError')))
            .finally(() => setLoading(false));
    };

    const visibleEntries = useMemo(() => {
        const query = search.trim().toLowerCase();
        return query ? entries.filter((entry) => entry.name?.toLowerCase().includes(query)) : entries;
    }, [entries, search]);

    useEffect(() => {
        if (open && (server || credentials || local)) {
            load(initialPath && initialPath.trim() !== '' ? initialPath : '/');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, server, credentials, local]);

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

    const title = local
        ? t('directoryBrowser.titleLocal')
        : server
          ? t('directoryBrowser.titleWithServer', { name: server.name })
          : t('directoryBrowser.title');

    return (
        <Modal
            title={title}
            open={open}
            onCancel={onClose}
            width="min(560px, 92vw)"
            footer={
                <div className="form-actions form-actions--end">
                    <SecondaryButton htmlType="button" onClick={onClose}>
                        {t('directoryBrowser.cancel')}
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
                        {t('directoryBrowser.select')}
                    </PrimaryButton>
                </div>
            }
            destroyOnClose
        >
            <div style={{ marginBottom: 12 }}>
                <Breadcrumb items={breadcrumbItems} />
            </div>

            {!loading && !error && entries.length > 0 && (
                <Input
                    className="directory-browser-search"
                    prefix={<Search size={14} />}
                    placeholder={t('directoryBrowser.searchPlaceholder')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value ?? '')}
                    onKeyDown={(e) => e.stopPropagation()}
                    allowClear
                />
            )}

            {loading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '24px 0' }}>
                    <Spin size="small" />
                    <span>{t('directoryBrowser.loading')}</span>
                </div>
            )}

            {!loading && error && <Alert type="error" showIcon message={error} />}

            {!loading && !error && entries.length === 0 && <Empty description={t('directoryBrowser.noSubfolders')} />}

            {!loading && !error && entries.length > 0 && visibleEntries.length === 0 && (
                <Empty description={t('directoryBrowser.noMatch')} />
            )}

            {!loading && !error && visibleEntries.length > 0 && (
                <div className="directory-browser-list">
                    {visibleEntries.map((entry) => (
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
