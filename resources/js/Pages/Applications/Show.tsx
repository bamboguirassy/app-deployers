import ApplicationDetailsPanel from '@/Components/Applications/ApplicationDetailsPanel';
import ApplicationSwitcher from '@/Components/Applications/ApplicationSwitcher';
import DeploymentsPanel from '@/Components/Applications/DeploymentsPanel';
import EnvironmentWorkspace from '@/Components/Applications/EnvironmentWorkspace';
import MembersPanel from '@/Components/Applications/MembersPanel';
import RunDeployButton from '@/Components/Applications/RunDeployButton';
import TargetWorkspace from '@/Components/Applications/TargetWorkspace';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { useConfirm } from '@/theme/ConfirmContext';
import { ApplicationMember, PageProps } from '@/types';
import { Application, Deployment, Framework, Server } from '@/types/models';
import { Head, router, usePage } from '@inertiajs/react';
import { Avatar, Dropdown } from 'antd';
import { Boxes, GitBranch, History, Layers, MoreHorizontal, Settings, Trash2, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface DeploymentKpis {
    total: number;
    running: number;
    succes: number;
    echec: number;
    success_rate: number;
    avg_duration_ms: number;
}

interface MembersKpis {
    total: number;
    owner: number;
    manager: number;
    deployer: number;
    viewer: number;
}

type TabKey = 'targets' | 'environments' | 'members' | 'deployments' | 'details';

export default function Show({
    application,
    members,
    membersKpis,
    activeMembers,
    deployments,
    deploymentsKpis,
    frameworks,
    servers,
    workspaceApplications,
    can,
}: {
    application: Application;
    members: ApplicationMember[];
    membersKpis: MembersKpis;
    activeMembers: { id: number; name: string; email: string }[];
    deployments: { data: Deployment[] };
    deploymentsKpis: DeploymentKpis;
    frameworks: Framework[];
    servers: Server[];
    workspaceApplications: Pick<Application, 'id' | 'name' | 'slug' | 'logo_url'>[];
    can: {
        manageTargetsAndPipeline: boolean;
        manageEnvironments: boolean;
        deploy: boolean;
        update: boolean;
    };
}) {
    const { t } = useTranslation('applications');
    const { workspace } = usePage<PageProps>().props;
    const canCreateApplication = workspace?.role === 'owner' || workspace?.role === 'manager';
    const confirm = useConfirm();
    const logoInputRef = useRef<HTMLInputElement>(null);

    // Permet un lien profond depuis la page d'un déploiement vers
    // "Targets & Pipeline" avec le bon target déjà sélectionné (?tab=targets&target=123).
    const initialParams = new URLSearchParams(window.location.search);
    const initialTabParam = initialParams.get('tab') as TabKey | null;
    const initialTargetId = initialParams.get('target');

    const storageKey = `app-tab:${application.id}`;
    const validTabs: TabKey[] = ['targets', 'environments', 'members', 'deployments', 'details'];
    const storedTab = localStorage.getItem(storageKey) as TabKey | null;
    const resolvedInitialTab: TabKey =
        initialTabParam ?? (storedTab && validTabs.includes(storedTab) ? storedTab : 'targets');

    const [activeTab, setActiveTab] = useState<TabKey>(resolvedInitialTab);

    const switchTab = (tab: TabKey) => {
        setActiveTab(tab);
        localStorage.setItem(storageKey, tab);
    };

    useEffect(() => {
        if (initialTabParam || initialTargetId) {
            window.history.replaceState(null, '', window.location.pathname);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const uploadLogo = (file: File) => {
        router.post(
            route('applications.update', [workspace!.slug, application.slug]),
            { name: application.name, description: application.description ?? '', logo: file },
            { forceFormData: true, preserveScroll: true },
        );
    };

    const destroy = () => {
        confirm.confirm({
            title: t('show.confirmDelete.title', { name: application.name }),
            content: t('show.confirmDelete.content'),
            okType: 'danger',
            okText: t('show.confirmDelete.okText'),
            cancelText: t('show.confirmDelete.cancelText'),
            onOk: () => router.delete(route('applications.destroy', [workspace!.slug, application.slug])),
        });
    };

    return (
        <AuthenticatedLayout
            breadcrumbs={[{ label: t('show.breadcrumbApplications'), href: route('applications.index', workspace!.slug) }, { label: application.name }]}
            appSwitcher={
                <div className="app-switcher">
                    <div
                        role={can.update ? 'button' : undefined}
                        tabIndex={can.update ? 0 : undefined}
                        aria-label={can.update ? t('show.changeLogoAriaLabel') : undefined}
                        style={{ cursor: can.update ? 'pointer' : 'default' }}
                        onClick={() => {
                            if (!can.update) return;
                            logoInputRef.current?.click();
                        }}
                        onKeyDown={(e) => {
                            if (!can.update) return;
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                logoInputRef.current?.click();
                            }
                        }}
                    >
                        <Avatar
                            size={28}
                            src={application.logo_url ?? undefined}
                            icon={!application.logo_url && <Boxes size={14} />}
                            shape="square"
                        />
                    </div>

                    <ApplicationSwitcher
                        workspaceSlug={workspace!.slug}
                        current={application}
                        applications={workspaceApplications}
                        canCreate={canCreateApplication}
                    />

                    {can.update && (
                        <input
                            ref={logoInputRef}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])}
                        />
                    )}
                </div>
            }
            tabs={[
                { key: 'targets', label: t('show.tabs.targets'), icon: <GitBranch size={14} />, onClick: () => switchTab('targets') },
                { key: 'environments', label: t('show.tabs.environments'), icon: <Layers size={14} />, onClick: () => switchTab('environments') },
                { key: 'members', label: t('show.tabs.members'), icon: <Users size={14} />, onClick: () => switchTab('members') },
                { key: 'deployments', label: t('show.tabs.deployments'), icon: <History size={14} />, onClick: () => switchTab('deployments') },
                { key: 'details', label: t('show.tabs.details'), icon: <Settings size={14} />, onClick: () => switchTab('details') },
            ]}
            activeTab={activeTab}
            actions={
                <>
                    {can.deploy && <RunDeployButton application={application} />}
                    {can.update && (
                        <Dropdown
                            menu={{
                                items: [
                                    {
                                        key: 'delete',
                                        danger: true,
                                        icon: <Trash2 size={14} />,
                                        label: t('show.deleteApplication'),
                                        onClick: destroy,
                                    },
                                ],
                            }}
                            trigger={['click']}
                        >
                            <button type="button" className="env-matrix-overflow-btn" aria-label={t('show.moreActionsAriaLabel')}>
                                <MoreHorizontal size={16} />
                            </button>
                        </Dropdown>
                    )}
                </>
            }
        >
            <Head title={application.name} />

            {application.description && (
                <p className="section-hint" style={{ marginBottom: 16 }}>
                    {application.description}
                </p>
            )}

            {activeTab === 'targets' && (
                <TargetWorkspace
                    application={application}
                    frameworks={frameworks}
                    canManage={can.manageTargetsAndPipeline}
                    initialTargetId={initialTargetId ?? undefined}
                    activeMembers={activeMembers}
                />
            )}

            {activeTab === 'environments' && (
                <EnvironmentWorkspace
                    application={application}
                    frameworks={frameworks}
                    servers={servers}
                    canManage={can.manageEnvironments}
                    canDeploy={can.deploy}
                />
            )}

            {activeTab === 'members' && (
                <MembersPanel application={application} members={members} kpis={membersKpis} canManage={can.update} />
            )}

            {activeTab === 'deployments' && (
                <DeploymentsPanel application={application} deployments={deployments} kpis={deploymentsKpis} canDeploy={can.deploy} />
            )}

            {activeTab === 'details' && <ApplicationDetailsPanel application={application} canManage={can.update} />}
        </AuthenticatedLayout>
    );
}
