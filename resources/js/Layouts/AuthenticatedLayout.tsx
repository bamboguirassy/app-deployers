import ActiveDeploymentBanner from '@/Components/ActiveDeploymentBanner';
import ActiveDeploymentsBell from '@/Components/ActiveDeploymentsBell';
import ApplicationLogo from '@/Components/ApplicationLogo';
import HelpModal from '@/Components/HelpModal';
import LanguageSwitcher from '@/Components/LanguageSwitcher';
import ThemeToggle from '@/Components/ThemeToggle';
import { PageProps } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { Avatar, Drawer, Dropdown, Input, Layout, Menu, message, Tooltip, type MenuProps } from 'antd';
import {
    Boxes,
    Check,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    CreditCard,
    HelpCircle,
    History,
    LayoutDashboard,
    LogOut,
    Menu as MenuIcon,
    Plus,
    Search,
    Server as ServerIcon,
    ShieldCheck,
    User as UserIcon,
    Users,
} from 'lucide-react';
import { PropsWithChildren, ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const COLLAPSE_STORAGE_KEY = 'app-deployers:sidebar-collapsed';

const { Sider, Header, Content } = Layout;

export interface Breadcrumb {
    label: string;
    href?: string;
}

export interface PageTab {
    key: string;
    label: string;
    icon?: ReactNode;
    href?: string;
    onClick?: () => void;
}

export default function Authenticated({
    header,
    breadcrumbs,
    tabs,
    activeTab,
    appSwitcher,
    actions,
    children,
}: PropsWithChildren<{
    header?: ReactNode;
    breadcrumbs?: Breadcrumb[];
    tabs?: PageTab[];
    activeTab?: string;
    appSwitcher?: ReactNode;
    actions?: ReactNode;
}>) {
    const { auth, workspace, workspaces, flash, locale } = usePage<PageProps>().props;
    const marketingHomeHref = locale === 'fr' ? '/fr' : '/';
    const { t } = useTranslation('dashboard');
    const user = auth.user;
    const [mobileOpen, setMobileOpen] = useState(false);
    const [helpOpen, setHelpOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_STORAGE_KEY) === '1');

    useEffect(() => {
        localStorage.setItem(COLLAPSE_STORAGE_KEY, collapsed ? '1' : '0');
    }, [collapsed]);

    useEffect(() => {
        if (flash?.status) message.success(flash.status);
    }, [flash?.status]);

    const wsSlug = workspace?.slug;
    const canManageServers = workspace?.role === 'owner' || workspace?.role === 'manager';
    const canCreateApplication = workspace?.role === 'owner' || workspace?.role === 'manager';

    // Certaines pages (ex: /profile) ne sont rattachées à aucun workspace : les
    // routes qui en dépendent ne doivent jamais être construites dans ce cas,
    // sinon Ziggy lève une erreur ("paramètre workspace requis") qui casse tout
    // le rendu de la sidebar.
    const menuItems: MenuProps['items'] = wsSlug
        ? [
              {
                  key: 'dashboard',
                  icon: <LayoutDashboard size={16} />,
                  label: <Link href={route('dashboard', wsSlug)}>{t('nav.dashboard')}</Link>,
              },
              {
                  key: 'deployments',
                  icon: <History size={16} />,
                  label: <Link href={route('deployments.all', wsSlug)}>{t('nav.deployments')}</Link>,
              },
              {
                  key: 'applications',
                  icon: <Boxes size={16} />,
                  label: <Link href={route('applications.index', wsSlug)}>{t('nav.applications')}</Link>,
              },
              ...(canManageServers
                  ? [
                        {
                            key: 'servers',
                            icon: <ServerIcon size={16} />,
                            label: <Link href={route('servers.index', wsSlug)}>{t('nav.servers')}</Link>,
                        },
                    ]
                  : []),
              {
                  key: 'users',
                  icon: <Users size={16} />,
                  label: <Link href={route('users.index', wsSlug)}>{t('nav.users')}</Link>,
              },
          ]
        : [
              {
                  key: 'home',
                  icon: <LayoutDashboard size={16} />,
                  label: <Link href={route('home')}>{t('nav.backToWorkspace')}</Link>,
              },
          ];

    const workspaceMenuItems: MenuProps['items'] = [
        ...workspaces.map((ws) => ({
            key: `ws-${ws.slug}`,
            icon: ws.slug === workspace?.slug ? <Check size={14} /> : <span style={{ width: 14, display: 'inline-block' }} />,
            label: <Link href={route('dashboard', ws.slug)}>{ws.name}</Link>,
        })),
        { type: 'divider' as const },
        {
            key: 'ws-create',
            icon: <Plus size={14} />,
            label: <Link href={route('workspaces.create')}>{t('nav.newWorkspace')}</Link>,
        },
    ];

    const selectedKey = route().current('applications.*')
        ? 'applications'
        : route().current('deployments.*')
          ? 'deployments'
          : route().current('servers.*')
            ? 'servers'
            : route().current('users.*')
              ? 'users'
              : route().current('dashboard')
                ? 'dashboard'
                : '';

    const accountMenuItems: MenuProps['items'] = wsSlug
        ? [
              ...(workspace?.plan
                  ? [
                        {
                            key: 'plan',
                            disabled: true,
                            label: <span className="app-shell__account-plan-label">{t('account.currentPlan', { plan: workspace.plan.name })}</span>,
                        },
                        { type: 'divider' as const },
                    ]
                  : []),
              {
                  key: 'billing',
                  icon: <CreditCard size={14} />,
                  label: <Link href={route('billing.show', wsSlug)}>{t('account.billing')}</Link>,
              },
          ]
        : [];

    const userMenuItems: MenuProps['items'] = [
        {
            key: 'profile',
            icon: <UserIcon size={14} />,
            label: <Link href={route('profile.edit')}>{t('account.profile')}</Link>,
        },
        ...(user.is_super_admin
            ? [
                  {
                      key: 'admin',
                      icon: <ShieldCheck size={14} />,
                      label: <Link href={route('admin.dashboard')}>{t('account.administration')}</Link>,
                  },
              ]
            : []),
        {
            key: 'logout',
            icon: <LogOut size={14} />,
            danger: true,
            label: (
                <Link href={route('logout')} method="post" as="button">
                    {t('account.logout')}
                </Link>
            ),
        },
    ];

    const sidebarContent = (isDesktop: boolean) => (
        <>
            <div className="app-shell__brand">
                <Link href={marketingHomeHref}>
                    <ApplicationLogo />
                </Link>
                {(!isDesktop || !collapsed) && <span>App Deployer</span>}

                {isDesktop && (
                    <button
                        type="button"
                        className="app-shell__collapse-toggle"
                        onClick={() => setCollapsed((c) => !c)}
                        aria-label={collapsed ? t('nav.openMenu') : t('nav.closeMenu')}
                    >
                        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                    </button>
                )}
            </div>

            {workspace && (!isDesktop || !collapsed) && (
                <div className="app-shell__workspace-switcher">
                    <Dropdown menu={{ items: workspaceMenuItems }} trigger={['click']} placement="bottomLeft" getPopupContainer={() => document.body}>
                        <button type="button" className="app-shell__workspace-trigger">
                            <span className="app-shell__workspace-name">{workspace.name}</span>
                            <ChevronDown size={13} />
                        </button>
                    </Dropdown>
                </div>
            )}

            {appSwitcher && (!isDesktop || !collapsed) && <div className="app-shell__app-switcher">{appSwitcher}</div>}

            {wsSlug && canCreateApplication && (!isDesktop || !collapsed) && (
                <div className="app-shell__cta">
                    <Link href={route('applications.create', wsSlug)} className="app-shell__cta-btn">
                        <Plus size={14} /> {t('nav.newApplication')}
                    </Link>
                </div>
            )}

            <Menu
                mode="inline"
                inlineCollapsed={isDesktop && collapsed}
                selectedKeys={[selectedKey]}
                items={menuItems}
                className="app-shell__menu"
                style={{ borderInlineEnd: 'none', paddingTop: 8 }}
                onClick={() => setMobileOpen(false)}
            />

            <Dropdown
                menu={{ items: accountMenuItems }}
                trigger={accountMenuItems.length > 0 ? ['click'] : []}
                placement="topLeft"
                getPopupContainer={() => document.body}
            >
                <button type="button" className="app-shell__account" aria-label={t('account.account')}>
                    <Avatar size={32}>{user.name.charAt(0).toUpperCase()}</Avatar>
                    {(!isDesktop || !collapsed) && (
                        <>
                            <div className="app-shell__account-info">
                                <strong>{user.name}</strong>
                                <small>{workspace?.plan ? workspace.plan.name : 'App Deployer'}</small>
                            </div>
                            <ChevronDown size={14} className="app-shell__account-chevron" />
                        </>
                    )}
                </button>
            </Dropdown>
        </>
    );

    return (
        <Layout className="app-shell">
            <Sider
                className="app-shell__sider app-shell__sider--desktop"
                trigger={null}
                collapsed={collapsed}
                collapsedWidth={72}
                width={240}
            >
                {sidebarContent(true)}
            </Sider>

            <Drawer
                placement="left"
                open={mobileOpen}
                onClose={() => setMobileOpen(false)}
                width={260}
                closable={false}
                className="app-shell__drawer"
                styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column' } }}
            >
                {sidebarContent(false)}
            </Drawer>

            <Layout className="app-shell__body">
                <Header className="app-shell__header">
                    <div className="app-shell__header-left">
                        <button
                            type="button"
                            className="app-shell__hamburger"
                            onClick={() => setMobileOpen(true)}
                            aria-label={t('nav.openMenu')}
                        >
                            <MenuIcon size={20} />
                        </button>

                        <div className="app-shell__breadcrumbs">
                            {breadcrumbs && breadcrumbs.length > 0 ? (
                                breadcrumbs.map((crumb, index) => (
                                    <span key={crumb.label} className="app-shell__breadcrumb-item">
                                        {crumb.href ? (
                                            <Link href={crumb.href}>{crumb.label}</Link>
                                        ) : (
                                            <span className="app-shell__breadcrumb-current">{crumb.label}</span>
                                        )}
                                        {index < breadcrumbs.length - 1 && <span className="app-shell__breadcrumb-sep">/</span>}
                                    </span>
                                ))
                            ) : (
                                <span className="app-shell__header-title">{header ?? t('nav.dashboard')}</span>
                            )}
                        </div>
                    </div>

                    <div className="app-shell__header-right">
                        <Tooltip title={t('header.globalSearchSoon')}>
                            <Input
                                className="app-shell__search"
                                prefix={<Search size={14} />}
                                placeholder={t('header.search')}
                                suffix={<span className="app-shell__search-kbd">⌘K</span>}
                                disabled
                            />
                        </Tooltip>

                        <ActiveDeploymentsBell />

                        <Tooltip title={t('header.help')}>
                            <button
                                type="button"
                                className="app-shell__icon-btn"
                                aria-label={t('header.help')}
                                onClick={() => setHelpOpen(true)}
                            >
                                <HelpCircle size={18} />
                            </button>
                        </Tooltip>

                        <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />

                        <LanguageSwitcher />

                        <ThemeToggle />

                        <Dropdown menu={{ items: userMenuItems }} trigger={['click']} placement="bottomRight">
                            <div className="app-shell__user">
                                <Avatar size="small">{user.name.charAt(0).toUpperCase()}</Avatar>
                            </div>
                        </Dropdown>
                    </div>
                </Header>

                <ActiveDeploymentBanner />

                {(tabs && tabs.length > 0) || actions ? (
                    <div className="app-shell__subheader">
                        <div className="app-shell__tabs">
                            {tabs?.map((tab) =>
                                tab.onClick ? (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        onClick={tab.onClick}
                                        className={`app-shell__tab ${activeTab === tab.key ? 'app-shell__tab--active' : ''}`}
                                    >
                                        {tab.icon}
                                        {tab.label}
                                    </button>
                                ) : (
                                    <Link
                                        key={tab.key}
                                        href={tab.href ?? '#'}
                                        className={`app-shell__tab ${activeTab === tab.key ? 'app-shell__tab--active' : ''}`}
                                    >
                                        {tab.icon}
                                        {tab.label}
                                    </Link>
                                ),
                            )}
                        </div>

                        {actions && <div className="app-shell__page-actions">{actions}</div>}
                    </div>
                ) : null}

                <Content className="app-shell__content">{children}</Content>
            </Layout>
        </Layout>
    );
}
