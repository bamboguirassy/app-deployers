import ApplicationLogo from '@/Components/ApplicationLogo';
import ThemeToggle from '@/Components/ThemeToggle';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { PropsWithChildren } from 'react';

export default function LegalLayout({
    title,
    description,
    updatedAt,
    children,
}: PropsWithChildren<{ title: string; description: string; updatedAt: string }>) {
    return (
        <div className="landing legal-page">
            <Head title={title}>
                <meta name="robots" content="index, follow" />
                <meta name="description" content={description} />
                <meta property="og:title" content={`${title} - App Deployer`} />
                <meta property="og:description" content={description} />
                <meta name="twitter:title" content={`${title} - App Deployer`} />
                <meta name="twitter:description" content={description} />
            </Head>

            <header className="landing-nav">
                <div className="landing-nav__inner">
                    <Link href={route('welcome')} className="landing-brand">
                        <ApplicationLogo />
                        <span>App Deployer</span>
                    </Link>
                    <ThemeToggle />
                </div>
            </header>

            <main className="legal-content">
                <Link href={route('welcome')} className="legal-back">
                    <ArrowLeft size={14} /> Retour à l'accueil
                </Link>

                <h1>{title}</h1>
                <p className="legal-updated-at">Dernière mise à jour : {updatedAt}</p>

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
