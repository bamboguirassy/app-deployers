import ApplicationsList, { ApplicationKpis } from '@/Components/Applications/ApplicationsList';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { Application } from '@/types/models';
import { Head, Link, usePage } from '@inertiajs/react';
import { Button, Typography } from 'antd';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const { Title, Paragraph } = Typography;

export default function Index({
    applications,
    kpis,
}: {
    applications: { data: Application[] };
    kpis: ApplicationKpis;
}) {
    const { t } = useTranslation('applications');
    const { workspace } = usePage<PageProps>().props;
    const canCreate = workspace?.role === 'owner' || workspace?.role === 'manager';

    return (
        <AuthenticatedLayout header={t('index.title')}>
            <Head title={t('index.title')} />

            <div className="applications-hero">
                <div>
                    <div className="applications-eyebrow">{t('index.eyebrow')}</div>
                    <Title level={2} style={{ margin: 0 }}>
                        {t('index.heading')}
                    </Title>
                    <Paragraph type="secondary" style={{ margin: '6px 0 0' }}>
                        {t('index.subtitle')}
                    </Paragraph>
                </div>

                {canCreate && (
                    <Link href={route('applications.create', workspace!.slug)}>
                        <Button className="applications-hero__action" type="primary" icon={<Plus size={16} />}>
                            {t('index.newApplication')}
                        </Button>
                    </Link>
                )}
            </div>

            <ApplicationsList
                searchUrl={route('applications.search', workspace!.slug)}
                initialItems={applications.data}
                initialKpis={kpis}
                emptyAction={
                    canCreate ? (
                        <Link href={route('applications.create', workspace!.slug)}>
                            <Button type="primary" icon={<Plus size={16} />}>
                                {t('index.createFirst')}
                            </Button>
                        </Link>
                    ) : undefined
                }
            />
        </AuthenticatedLayout>
    );
}
