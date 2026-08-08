import ApplicationLogo from '@/Components/ApplicationLogo';
import { Link } from '@inertiajs/react';
import { PropsWithChildren } from 'react';

export default function Guest({ children }: PropsWithChildren) {
    return (
        <div className="auth-shell">
            <div className="auth-card">
                <div className="auth-brand">
                    <Link href="/">
                        <ApplicationLogo />
                    </Link>
                    <h1>App Deployers</h1>
                    <p>Supervision et automatisation de vos déploiements</p>
                </div>

                {children}
            </div>
        </div>
    );
}
