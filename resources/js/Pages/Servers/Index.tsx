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
import { useTranslation } from 'react-i18next';

const { Title, Paragraph } = Typography;

export default function Index({ servers, kpis }: { servers: { data: Server[] }; kpis: ServerKpis }) {
    const { workspace } = usePage<PageProps>().props;
    const { t } = useTranslation('servers');
    const listRef = useRef<ServersListHandle>(null);
    const [creating, setCreating] = useState(false);

    return (
        <AuthenticatedLayout header={t('index.header')}>
            <Head title={t('index.title')} />

            <div className="premium-list-hero">
                <div>
                    <div className="premium-list-eyebrow">{t('index.eyebrow')}</div>
                    <Title level={2} style={{ margin: 0 }}>
                        {t('index.title')}
                    </Title>
                    <Paragraph type="secondary" style={{ margin: '6px 0 0' }}>
                        {t('index.description')}
                    </Paragraph>
                </div>

                <PrimaryButton className="premium-list-hero__action" onClick={() => setCreating(true)} icon={<Plus size={14} />}>
                    {t('index.newServer')}
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
