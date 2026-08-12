import ApplicationLogo from '@/Components/ApplicationLogo';
import { Link } from '@inertiajs/react';
import { PropsWithChildren } from 'react';

export default function Guest({
    children,
    wide = false,
}: PropsWithChildren<{ wide?: boolean }>) {
    return (
        <div className="auth-shell">
            <div className={`auth-card${wide ? ' auth-card--wide' : ''}`}>
                <div className="auth-brand">
                    <Link href="/">
                        <ApplicationLogo />
                    </Link>
                    <h1>App Deployer</h1>
                    <p>Supervision et automatisation de vos déploiements</p>
                </div>

                {children}
            </div>
        </div>
    );
}
