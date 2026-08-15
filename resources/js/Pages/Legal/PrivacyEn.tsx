import LegalLayout from '@/Layouts/LegalLayout';

export default function PrivacyEn() {
    return (
        <LegalLayout
            title="Privacy Policy"
            description="How App Deployer collects, uses and protects your personal data: account, billing, SSH connections and encrypted variables."
            updatedAt="August 12, 2026"
            locale="en"
            headChildren={
                <>
                    <link rel="alternate" hrefLang="en" href="/legal/privacy-policy" />
                    <link rel="alternate" hrefLang="fr" href="/privacy" />
                    <link rel="alternate" hrefLang="x-default" href="/legal/privacy-policy" />
                </>
            }
        >
            <p>
                This policy describes how <strong>Bambocloud</strong> ("we", the "Publisher"), the publisher
                of the App Deployer platform, collects, uses and protects your personal data when you use the
                Service.
            </p>

            <h2>1. Data we collect</h2>
            <ul>
                <li>
                    <strong>Account data</strong>: name, email address, password (hashed, never stored in
                    plain text).
                </li>
                <li>
                    <strong>Billing data</strong>: handled directly by our payment partner Paddle.com Market
                    Limited — we never store your bank details.
                </li>
                <li>
                    <strong>Configuration data</strong>: application, environment and deployment target
                    names, environment variables (encrypted at rest), SSH connection credentials (encrypted
                    at rest), webhook configuration.
                </li>
                <li>
                    <strong>Activity logs</strong>: deployment history, output of commands executed (which
                    may contain information you choose to print from your own scripts — avoid printing
                    secrets in plain text there), audit log of actions performed on your workspace.
                </li>
                <li>
                    <strong>Technical data</strong>: IP address, browser type, server logs, for security and
                    diagnostic purposes.
                </li>
            </ul>

            <h2>2. Why we use it</h2>
            <ul>
                <li>Provide, operate and maintain the Service (running the deployments you configure);</li>
                <li>Manage your account, subscription and billing through Paddle;</li>
                <li>Notify you of events related to your deployments (failure, status);</li>
                <li>Keep the platform secure and prevent abuse (rate limiting, webhook deduplication);</li>
                <li>Comply with our legal and regulatory obligations.</li>
            </ul>

            <h2>3. Legal basis for processing</h2>
            <p>
                Processing of your data relies on the performance of the contract between us (providing the
                Service), our legitimate interest (security, fraud prevention), and, where applicable, your
                consent (optional marketing communications).
            </p>

            <h2>4. Sharing your data</h2>
            <p>We never sell your personal data. It may be shared with:</p>
            <ul>
                <li>
                    <strong>Paddle.com Market Limited</strong>, our official reseller, for processing
                    payments and subscriptions;
                </li>
                <li>our hosting and infrastructure providers, to operate the Service technically;</li>
                <li>competent authorities, where required by law.</li>
            </ul>
            <p>
                Your SSH credentials and encrypted environment variables are never shared with a third party
                and are only decrypted for the time strictly necessary to run a deployment you triggered.
            </p>

            <h2>5. Retention period</h2>
            <p>
                Your account data is kept as long as your account is active. If your account is deleted, your
                personal data is deleted or anonymized within a reasonable timeframe, subject to legal
                retention obligations (in particular accounting requirements).
            </p>

            <h2>6. Your rights</h2>
            <p>
                Depending on your jurisdiction (in particular if the General Data Protection Regulation —
                GDPR — applies to you), you have a right of access, rectification, erasure, restriction of
                processing, portability and objection regarding your personal data. You can exercise these
                rights by contacting us at{' '}
                <a href="mailto:privacy@app-deployer.dev">privacy@app-deployer.dev</a>.
            </p>

            <h2>7. Security</h2>
            <p>
                Passwords are hashed, server connection credentials and environment variables are encrypted
                at rest. Access to a workspace's resources is scoped by role. Despite these measures, no
                system is 100% infallible; in the event of a security incident affecting your data, we will
                notify you in accordance with applicable regulations.
            </p>

            <h2>8. Cookies</h2>
            <p>
                We use cookies strictly necessary for the Service to function (authentication session,
                cross-site request forgery protection). We do not use third-party advertising cookies.
            </p>

            <h2>9. Changes to this policy</h2>
            <p>
                This policy may be updated periodically. The date of the last update appears at the top of
                this page.
            </p>

            <h2>10. Contact</h2>
            <p>
                For any question about this policy or your personal data, contact us at{' '}
                <a href="mailto:privacy@app-deployer.dev">privacy@app-deployer.dev</a>.
            </p>
        </LegalLayout>
    );
}
