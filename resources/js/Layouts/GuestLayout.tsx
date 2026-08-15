import ApplicationLogo from '@/Components/ApplicationLogo';
import { Link } from '@inertiajs/react';
import { PropsWithChildren } from 'react';
import { useTranslation } from 'react-i18next';

export default function Guest({
    children,
    wide = false,
}: PropsWithChildren<{ wide?: boolean }>) {
    const { t } = useTranslation('common');

    return (
        <div className="auth-shell">
            <div className={`auth-card${wide ? ' auth-card--wide' : ''}`}>
                <div className="auth-brand">
                    <Link href="/">
                        <ApplicationLogo />
                    </Link>
                    <h1>App Deployer</h1>
                    <p>{t('tagline')}</p>
                </div>

                {children}
            </div>
        </div>
    );
}
