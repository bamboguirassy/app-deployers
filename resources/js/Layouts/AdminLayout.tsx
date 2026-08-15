import ThemeToggle from '@/Components/ThemeToggle';
import { PageProps } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { Avatar, Drawer, Dropdown, Layout, Menu, message, type MenuProps } from 'antd';
import {
    ChevronLeft,
    CreditCard,
    LayoutDashboard,
    LogOut,
    Menu as MenuIcon,
    PackageCheck,
    Rocket,
    ShieldCheck,
    Users,
} from 'lucide-react';
import { PropsWithChildren, ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const { Sider, Header, Content } = Layout;

export interface AdminBreadcrumb {
    label: string;
    href?: string;
}

/**
 * Coquille visuelle du panneau super-admin (/admin), volontairement distincte
 * de AuthenticatedLayout (bande d'accent ambrée, badge "Super Admin", pas de
 * sélecteur de workspace) pour qu'on reconnaisse immédiatement le "mode
 * plateforme" — tout en réutilisant les mêmes primitives Ant Design Layout
 * pour rester cohérent avec le reste de l'app.
 */
export default function AdminLayout({
    breadcrumbs,
    actions,
    children,
}: PropsWithChildren<{
    breadcrumbs?: AdminBreadcrumb[];
    actions?: ReactNode;
}>) {
    const { auth, flash } = usePage<PageProps>().props;
    const { t } = useTranslation('admin');
    const user = auth.user;
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        if (flash?.status) message.success(flash.status);
    }, [flash?.status]);

    const menuItems: MenuProps['items'] = [
        {
            key: 'dashboard',
            icon: <LayoutDashboard size={16} />,
            label: <Link href={route('admin.dashboard')}>{t('layout.nav.dashboard')}</Link>,
        },
        {
            key: 'workspaces',
            icon: <CreditCard size={16} />,
            label: <Link href={route('admin.workspaces.index')}>{t('layout.nav.workspaces')}</Link>,
        },
        {
            key: 'users',
            icon: <Users size={16} />,
            label: <Link href={route('admin.users.index')}>{t('layout.nav.users')}</Link>,
        },
        {
            key: 'plans',
            icon: <PackageCheck size={16} />,
            label: <Link href={route('admin.plans.index')}>{t('layout.nav.plans')}</Link>,
        },
        {
            key: 'deployments',
            icon: <Rocket size={16} />,
            label: <Link href={route('admin.deployments.index')}>{t('layout.nav.deployments')}</Link>,
        },
    ];

    const selectedKey = route().current('admin.workspaces.*')
        ? 'workspaces'
        : route().current('admin.users.*')
          ? 'users'
          : route().current('admin.plans.*')
            ? 'plans'
            : route().current('admin.deployments.*')
              ? 'deployments'
              : 'dashboard';

    const userMenuItems: MenuProps['items'] = [
        {
            key: 'exit',
            icon: <ChevronLeft size={14} />,
            label: <Link href={route('home')}>{t('layout.backToApp')}</Link>,
        },
        {
            key: 'logout',
            icon: <LogOut size={14} />,
            danger: true,
            label: (
                <Link href={route('logout')} method="post" as="button">
                    {t('layout.logout')}
                </Link>
            ),
        },
    ];

    const sidebarContent = () => (
        <>
            <div className="admin-shell__brand">
                <ShieldCheck />
                <span>{t('layout.brand')}</span>
            </div>

            <div style={{ padding: '12px 20px 4px' }}>
                <span className="admin-shell__badge">
                    <ShieldCheck size={11} /> {t('layout.superAdminBadge')}
                </span>
            </div>

            <Menu
                mode="inline"
                selectedKeys={[selectedKey]}
                items={menuItems}
                className="admin-shell__menu"
                style={{ borderInlineEnd: 'none', paddingTop: 8 }}
                onClick={() => setMobileOpen(false)}
            />

            <div className="admin-shell__exit">
                <Link href={route('home')} className="app-shell__workspace-trigger" style={{ justifyContent: 'center' }}>
                    <ChevronLeft size={14} /> {t('layout.backToApp')}
                </Link>
            </div>
        </>
    );

    return (
        <Layout className="admin-shell">
            <div className="admin-shell__accent-bar" />

            <Layout style={{ flexDirection: 'row', height: 'calc(100vh - 3px)' }}>
                <Sider className="admin-shell__sider" trigger={null} width={240}>
                    {sidebarContent()}
                </Sider>

                <Drawer
                    placement="left"
                    open={mobileOpen}
                    onClose={() => setMobileOpen(false)}
                    width={260}
                    closable={false}
                    className="admin-shell__drawer"
                    styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column' } }}
                >
                    {sidebarContent()}
                </Drawer>

                <Layout className="admin-shell__body">
                    <Header className="admin-shell__header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                            <button
                                type="button"
                                className="admin-shell__hamburger"
                                onClick={() => setMobileOpen(true)}
                                aria-label={t('layout.openMenu')}
                            >
                                <MenuIcon size={20} />
                            </button>

                            <div className="admin-shell__breadcrumbs">
                                {breadcrumbs && breadcrumbs.length > 0 ? (
                                    breadcrumbs.map((crumb, index) => (
                                        <span key={crumb.label} className="admin-shell__breadcrumb-item">
                                            {crumb.href ? (
                                                <Link href={crumb.href}>{crumb.label}</Link>
                                            ) : (
                                                <span className="admin-shell__breadcrumb-current">{crumb.label}</span>
                                            )}
                                            {index < breadcrumbs.length - 1 && <span className="admin-shell__breadcrumb-sep">/</span>}
                                        </span>
                                    ))
                                ) : (
                                    <span className="admin-shell__breadcrumb-current">{t('layout.breadcrumbFallback')}</span>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            {actions}
                            <ThemeToggle />
                            <Dropdown menu={{ items: userMenuItems }} trigger={['click']} placement="bottomRight">
                                <div className="app-shell__user">
                                    <Avatar size="small" style={{ backgroundColor: 'var(--color-admin)' }}>
                                        {user.name.charAt(0).toUpperCase()}
                                    </Avatar>
                                </div>
                            </Dropdown>
                        </div>
                    </Header>

                    <Content className="admin-shell__content">{children}</Content>
                </Layout>
            </Layout>
        </Layout>
    );
}
