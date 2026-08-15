import ApplicationLogo from '@/Components/ApplicationLogo';
import ThemeToggle from '@/Components/ThemeToggle';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { PropsWithChildren, ReactNode } from 'react';

const STRINGS = {
    fr: {
        back: 'Retour à l\'accueil',
        updatedAt: 'Dernière mise à jour :',
        allRightsReserved: 'Tous droits réservés.',
        terms: "Conditions d'utilisation",
        privacy: 'Politique de confidentialité',
        refunds: 'Politique de remboursement',
    },
    en: {
        back: 'Back to home',
        updatedAt: 'Last updated:',
        allRightsReserved: 'All rights reserved.',
        terms: 'Terms of Service',
        privacy: 'Privacy Policy',
        refunds: 'Refund Policy',
    },
} as const;

export default function LegalLayout({
    title,
    description,
    updatedAt,
    locale = 'fr',
    headChildren,
    children,
}: PropsWithChildren<{
    title: string;
    description: string;
    updatedAt: string;
    locale?: 'fr' | 'en';
    headChildren?: ReactNode;
}>) {
    const t = STRINGS[locale];
    // French legal pages (Terms/Privacy/Refunds) are pre-existing, already-indexed
    // content and intentionally keep their original `route('welcome')` /
    // `route('legal.*')` links unchanged — this is the default (locale="fr") path.
    // English legal pages pass locale="en" and link to the English equivalents.
    const homeHref = locale === 'fr' ? route('welcome') : '/';
    const termsHref = locale === 'fr' ? route('legal.terms') : route('legal.terms.en');
    const privacyHref = locale === 'fr' ? route('legal.privacy') : route('legal.privacy.en');
    const refundsHref = locale === 'fr' ? route('legal.refunds') : route('legal.refunds.en');

    return (
        <div className="landing legal-page">
            <Head title={title}>
                <meta name="robots" content="index, follow" />
                <meta name="description" content={description} />
                <meta property="og:title" content={`${title} - App Deployer`} />
                <meta property="og:description" content={description} />
                <meta name="twitter:title" content={`${title} - App Deployer`} />
                <meta name="twitter:description" content={description} />
                {headChildren}
            </Head>

            <header className="landing-nav">
                <div className="landing-nav__inner">
                    <Link href={homeHref} className="landing-brand">
                        <ApplicationLogo />
                        <span>App Deployer</span>
                    </Link>
                    <ThemeToggle />
                </div>
            </header>

            <main className="legal-content">
                <Link href={homeHref} className="legal-back">
                    <ArrowLeft size={14} /> {t.back}
                </Link>

                <h1>{title}</h1>
                <p className="legal-updated-at">{t.updatedAt} {updatedAt}</p>

                {children}
            </main>

            <footer className="landing-footer">
                <div className="landing-brand landing-brand--footer">
                    <ApplicationLogo />
                    <span>App Deployer</span>
                </div>
                <p>&copy; {new Date().getFullYear()} App Deployer. {t.allRightsReserved}</p>
                <p className="legal-footer-links">
                    <Link href={termsHref}>{t.terms}</Link>
                    <Link href={privacyHref}>{t.privacy}</Link>
                    <Link href={refundsHref}>{t.refunds}</Link>
                </p>
            </footer>
        </div>
    );
}
