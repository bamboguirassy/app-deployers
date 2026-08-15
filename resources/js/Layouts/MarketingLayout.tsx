import ApplicationLogo from '@/Components/ApplicationLogo';
import ThemeToggle from '@/Components/ThemeToggle';
import { NAV_LINKS } from '@/constants/marketing';
import { NAV_LINKS as NAV_LINKS_EN } from '@/constants/marketing.en';
import { Head, Link } from '@inertiajs/react';
import { Button, Drawer } from 'antd';
import { Menu } from 'lucide-react';
import { PropsWithChildren, ReactNode, useState } from 'react';

type Breadcrumb = { label: string; href?: string };

const STRINGS = {
    fr: {
        home: 'Accueil',
        breadcrumbNav: "Fil d'Ariane",
        login: 'Se connecter',
        register: 'Commencer gratuitement',
        openMenu: 'Ouvrir le menu',
        allRightsReserved: 'Tous droits réservés.',
        terms: "Conditions d'utilisation",
        privacy: 'Politique de confidentialité',
        refunds: 'Politique de remboursement',
        switchLabel: '🇬🇧 View in English',
    },
    en: {
        home: 'Home',
        breadcrumbNav: 'Breadcrumb',
        login: 'Log in',
        register: 'Start for free',
        openMenu: 'Open menu',
        allRightsReserved: 'All rights reserved.',
        terms: 'Terms of Service',
        privacy: 'Privacy Policy',
        refunds: 'Refund Policy',
        switchLabel: '🇫🇷 Voir en français',
    },
} as const;

export default function MarketingLayout({
    title,
    description,
    locale,
    altLocaleHref,
    breadcrumbs,
    headChildren,
    children,
}: PropsWithChildren<{
    title: string;
    description: string;
    locale: 'en' | 'fr';
    altLocaleHref?: string;
    breadcrumbs?: Breadcrumb[];
    headChildren?: ReactNode;
}>) {
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const t = STRINGS[locale];
    const navLinks = locale === 'fr' ? NAV_LINKS : NAV_LINKS_EN;
    const homeHref = locale === 'fr' ? '/fr' : '/';
    const termsRoute = locale === 'fr' ? route('legal.terms') : route('legal.terms.en');
    const privacyRoute = locale === 'fr' ? route('legal.privacy') : route('legal.privacy.en');
    const refundsRoute = locale === 'fr' ? route('legal.refunds') : route('legal.refunds.en');

    return (
        <div className="landing">
            <Head>
                <title>{title}</title>
                <meta name="robots" content="index, follow" />
                <meta name="description" content={description} />
                <meta property="og:title" content={title} />
                <meta property="og:description" content={description} />
                <meta name="twitter:title" content={title} />
                <meta name="twitter:description" content={description} />
                {breadcrumbs && breadcrumbs.length > 0 && (
                    <script type="application/ld+json">
                        {JSON.stringify({
                            '@context': 'https://schema.org',
                            '@type': 'BreadcrumbList',
                            itemListElement: [
                                { '@type': 'ListItem', position: 1, name: t.home, item: homeHref },
                                ...breadcrumbs.map((crumb, index) => ({
                                    '@type': 'ListItem',
                                    position: index + 2,
                                    name: crumb.label,
                                    ...(crumb.href ? { item: crumb.href } : {}),
                                })),
                            ],
                        })}
                    </script>
                )}
                {headChildren}
            </Head>

            <header className="landing-nav">
                <div className="landing-nav__inner">
                    <Link href={homeHref} className="landing-brand">
                        <ApplicationLogo />
                        <span>App Deployer</span>
                    </Link>

                    <nav className="landing-nav__links">
                        {navLinks.map(({ href, label }) => (
                            <Link href={href} key={href}>
                                {label}
                            </Link>
                        ))}
                    </nav>

                    <div className="landing-nav__actions">
                        {altLocaleHref && (
                            <Link href={altLocaleHref} className="form-link landing-nav__locale-switch">
                                {t.switchLabel}
                            </Link>
                        )}
                        <ThemeToggle />
                        <Link href={route('login')} className="form-link">
                            {t.login}
                        </Link>
                        <Link href={route('register')}>
                            <Button type="primary" size="large">
                                {t.register}
                            </Button>
                        </Link>
                    </div>

                    <button
                        type="button"
                        className="landing-nav__burger"
                        aria-label={t.openMenu}
                        onClick={() => setMobileNavOpen(true)}
                    >
                        <Menu size={22} />
                    </button>
                </div>
            </header>

            <Drawer
                open={mobileNavOpen}
                onClose={() => setMobileNavOpen(false)}
                placement="right"
                title={
                    <span className="landing-brand">
                        <ApplicationLogo />
                        <span>App Deployer</span>
                    </span>
                }
                className="landing-mobile-drawer"
                width="min(85vw, 320px)"
            >
                <nav className="landing-mobile-nav">
                    {navLinks.map(({ href, label }) => (
                        <Link href={href} key={href} onClick={() => setMobileNavOpen(false)}>
                            {label}
                        </Link>
                    ))}
                </nav>

                <div className="landing-mobile-nav__actions">
                    {altLocaleHref && (
                        <Link
                            href={altLocaleHref}
                            className="form-link landing-nav__locale-switch"
                            onClick={() => setMobileNavOpen(false)}
                        >
                            {t.switchLabel}
                        </Link>
                    )}
                    <ThemeToggle />
                    <Link href={route('login')} className="form-link" onClick={() => setMobileNavOpen(false)}>
                        {t.login}
                    </Link>
                    <Link href={route('register')} onClick={() => setMobileNavOpen(false)}>
                        <Button type="primary" size="large" block>
                            {t.register}
                        </Button>
                    </Link>
                </div>
            </Drawer>

            <main>
                {breadcrumbs && breadcrumbs.length > 0 && (
                    <nav className="landing-breadcrumb" aria-label={t.breadcrumbNav}>
                        <Link href={homeHref}>{t.home}</Link>
                        {breadcrumbs.map((crumb) => (
                            <span key={crumb.label}>
                                {' '}
                                / {crumb.href ? <Link href={crumb.href}>{crumb.label}</Link> : crumb.label}
                            </span>
                        ))}
                    </nav>
                )}

                {children}
            </main>

            <footer className="landing-footer">
                <div className="landing-brand landing-brand--footer">
                    <ApplicationLogo />
                    <span>App Deployer</span>
                </div>
                <p>&copy; {new Date().getFullYear()} App Deployer. {t.allRightsReserved}</p>
                <p className="legal-footer-links">
                    <Link href={termsRoute}>{t.terms}</Link>
                    <Link href={privacyRoute}>{t.privacy}</Link>
                    <Link href={refundsRoute}>{t.refunds}</Link>
                </p>
            </footer>
        </div>
    );
}
