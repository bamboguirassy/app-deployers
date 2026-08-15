import MarketingLayout from '@/Layouts/MarketingLayout';
import { Link } from '@inertiajs/react';
import { Button } from 'antd';
import { ArrowRight, ShieldCheck } from 'lucide-react';

export default function Security() {
    return (
        <MarketingLayout
            title="Security — Encrypted SSH connections and full auditing"
            description="How App Deployer secures your deployments: encrypted, ephemeral SSH connections, encrypted environment variables, role-based access control and a full audit trail."
            breadcrumbs={[{ label: 'Security' }]}
            locale="en"
            altLocaleHref="/securite"
            headChildren={
                <>
                    <link rel="alternate" hrefLang="en" href="/security" />
                    <link rel="alternate" hrefLang="fr" href="/securite" />
                    <link rel="alternate" hrefLang="x-default" href="/security" />
                </>
            }
        >
            <div className="landing-page-header">
                <h1>We host the platform, you keep your servers</h1>
                <p>
                    App Deployer orchestrates your deployments from a platform we operate; your servers
                    and application data stay with you. The SSH connection is the only boundary between the
                    two, and it's designed to stay closed by default.
                </p>
            </div>

            <section className="landing-section">
                <div className="landing-security">
                    <div className="landing-security__icon">
                        <ShieldCheck size={28} />
                    </div>
                    <div>
                        <ul className="landing-security__list">
                            <li>SSH credentials (password or key) are encrypted, never stored in plain text.</li>
                            <li>No standing access: the connection is only opened at deployment time.</li>
                            <li>Access and actions are scoped per workspace, with a full audit history.</li>
                        </ul>
                    </div>
                </div>
            </section>

            <section className="legal-content" style={{ maxWidth: 720, padding: '0 20px 64px' }}>
                <h2>Encrypted, ephemeral SSH connections</h2>
                <p>
                    Your connection credentials (password or private key) are encrypted at rest in our
                    database. They are only decrypted at the precise moment a deployment starts, for the
                    time it takes to run the pipeline on your server, and the connection is closed
                    immediately after. There is no persistent SSH session kept open outside these execution
                    windows.
                </p>

                <h2>Environment variables and secrets</h2>
                <p>
                    Every environment (Production, Staging...) of a deployment target has its own set of
                    variables, encrypted on the platform side and isolated from one another: a secret
                    configured for Staging is never accessible from Production, and vice versa. Variables
                    flagged as secret are masked in the UI once saved.
                </p>

                <h2>Role-based access control</h2>
                <p>
                    Access to an application and its environments is governed by roles scoped to the
                    workspace (owner, manager, deployer, viewer), not by a global account-wide access level.
                    A member can only trigger a deployment, edit a pipeline, or view variables if their role
                    explicitly allows it.
                </p>

                <h2>Full audit trail</h2>
                <p>
                    Every deployment and every configuration change (pipeline, variables, members) is
                    logged: who did what, when, and through which trigger (manual or webhook). This log can
                    be reviewed at any time to trace an incident or meet an internal audit requirement.
                </p>
            </section>

            <div className="landing-page-cta" style={{ paddingBottom: 64 }}>
                <Link href={route('register')}>
                    <Button type="primary" size="large">
                        Create my workspace
                        <ArrowRight size={16} />
                    </Button>
                </Link>
            </div>
        </MarketingLayout>
    );
}
