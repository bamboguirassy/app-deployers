import ApplicationsList, { ApplicationKpis } from '@/Components/Applications/ApplicationsList';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { Application } from '@/types/models';
import { Head, Link, usePage } from '@inertiajs/react';
import { Button, Typography } from 'antd';
import { Plus } from 'lucide-react';

const { Title, Paragraph } = Typography;

export default function Index({
    applications,
    kpis,
}: {
    applications: { data: Application[] };
    kpis: ApplicationKpis;
}) {
    const { workspace } = usePage<PageProps>().props;
    const canCreate = workspace?.role === 'owner' || workspace?.role === 'manager';

    return (
        <AuthenticatedLayout header="Applications">
            <Head title="Applications" />

            <div className="applications-hero">
                <div>
                    <div className="applications-eyebrow">Workspace</div>
                    <Title level={2} style={{ margin: 0 }}>
                        Vos applications
                    </Title>
                    <Paragraph type="secondary" style={{ margin: '6px 0 0' }}>
                        Chaque application regroupe ses targets, ses environnements et son pipeline de déploiement.
                    </Paragraph>
                </div>

                {canCreate && (
                    <Link href={route('applications.create', workspace!.slug)}>
                        <Button className="applications-hero__action" type="primary" icon={<Plus size={16} />}>
                            Nouvelle application
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
                                Créer ma première application
                            </Button>
                        </Link>
                    ) : undefined
                }
            />
        </AuthenticatedLayout>
    );
}
