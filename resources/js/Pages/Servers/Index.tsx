import ServerFormModal from '@/Components/Servers/ServerFormModal';
import ServersList, { ServerKpis, ServersListHandle } from '@/Components/Servers/ServersList';
import PrimaryButton from '@/Components/PrimaryButton';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { Server } from '@/types/models';
import { Head, usePage } from '@inertiajs/react';
import { Typography } from 'antd';
import { Plus } from 'lucide-react';
import { useRef, useState } from 'react';

const { Title, Paragraph } = Typography;

export default function Index({ servers, kpis }: { servers: { data: Server[] }; kpis: ServerKpis }) {
    const { workspace } = usePage<PageProps>().props;
    const listRef = useRef<ServersListHandle>(null);
    const [creating, setCreating] = useState(false);

    return (
        <AuthenticatedLayout header="Serveurs">
            <Head title="Serveurs" />

            <div className="premium-list-hero">
                <div>
                    <div className="premium-list-eyebrow">Workspace</div>
                    <Title level={2} style={{ margin: 0 }}>
                        Serveurs
                    </Title>
                    <Paragraph type="secondary" style={{ margin: '6px 0 0' }}>
                        Déclarez ici les serveurs sur lesquels vos applications peuvent être déployées à distance via SSH.
                    </Paragraph>
                </div>

                <PrimaryButton className="premium-list-hero__action" onClick={() => setCreating(true)} icon={<Plus size={14} />}>
                    Nouveau serveur
                </PrimaryButton>
            </div>

            <ServersList
                ref={listRef}
                workspaceSlug={workspace!.slug}
                searchUrl={route('servers.search', workspace!.slug)}
                initialItems={servers.data}
                initialKpis={kpis}
            />

            <ServerFormModal
                workspaceSlug={workspace!.slug}
                open={creating}
                onClose={() => {
                    setCreating(false);
                    listRef.current?.refresh();
                }}
            />
        </AuthenticatedLayout>
    );
}
