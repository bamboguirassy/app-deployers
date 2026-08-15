import ApplicationLogo from '@/Components/ApplicationLogo';
import ThemeToggle from '@/Components/ThemeToggle';
import { NAV_LINKS } from '@/constants/marketing';
import { Head, Link } from '@inertiajs/react';
import { Button, Drawer } from 'antd';
import { Menu } from 'lucide-react';
import { PropsWithChildren, ReactNode, useState } from 'react';

type Breadcrumb = { label: string; href?: string };

export default function MarketingLayout({
    title,
    description,
    breadcrumbs,
    headChildren,
    children,
}: PropsWithChildren<{
    title: string;
    description: string;
    breadcrumbs?: Breadcrumb[];
    headChildren?: ReactNode;
}>) {
    const [mobileNavOpen, setMobileNavOpen] = useState(false);

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
                                { '@type': 'ListItem', position: 1, name: 'Accueil', item: '/' },
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
                    <Link href="/" className="landing-brand">
                        <ApplicationLogo />
                        <span>App Deployer</span>
                    </Link>

                    <nav className="landing-nav__links">
                        {NAV_LINKS.map(({ href, label }) => (
                            <Link href={href} key={href}>
                                {label}
                            </Link>
                        ))}
                    </nav>

                    <div className="landing-nav__actions">
                        <ThemeToggle />
                        <Link href={route('login')} className="form-link">
                            Se connecter
                        </Link>
                        <Link href={route('register')}>
                            <Button type="primary" size="large">
                                Commencer gratuitement
                            </Button>
                        </Link>
                    </div>

                    <button
                        type="button"
                        className="landing-nav__burger"
                        aria-label="Ouvrir le menu"
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
                    {NAV_LINKS.map(({ href, label }) => (
                        <Link href={href} key={href} onClick={() => setMobileNavOpen(false)}>
                            {label}
                        </Link>
                    ))}
                </nav>

                <div className="landing-mobile-nav__actions">
                    <ThemeToggle />
                    <Link href={route('login')} className="form-link" onClick={() => setMobileNavOpen(false)}>
                        Se connecter
                    </Link>
                    <Link href={route('register')} onClick={() => setMobileNavOpen(false)}>
                        <Button type="primary" size="large" block>
                            Commencer gratuitement
                        </Button>
                    </Link>
                </div>
            </Drawer>

            <main>
                {breadcrumbs && breadcrumbs.length > 0 && (
                    <nav className="landing-breadcrumb" aria-label="Fil d'Ariane">
                        <Link href="/">Accueil</Link>
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
                <p>&copy; {new Date().getFullYear()} App Deployer. Tous droits réservés.</p>
                <p className="legal-footer-links">
                    <Link href={route('legal.terms')}>Conditions d'utilisation</Link>
                    <Link href={route('legal.privacy')}>Politique de confidentialité</Link>
                    <Link href={route('legal.refunds')}>Politique de remboursement</Link>
                </p>
            </footer>
        </div>
    );
}
