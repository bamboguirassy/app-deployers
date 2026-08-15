import LegalLayout from '@/Layouts/LegalLayout';

export default function TermsEn() {
    return (
        <LegalLayout
            title="Terms of Service"
            description="Terms of Service for the App Deployer platform, published by Bambocloud: access to the service, accounts, commitments and liability."
            updatedAt="August 12, 2026"
            locale="en"
            headChildren={
                <>
                    <link rel="alternate" hrefLang="en" href="/legal/terms-of-service" />
                    <link rel="alternate" hrefLang="fr" href="/terms" />
                    <link rel="alternate" hrefLang="x-default" href="/legal/terms-of-service" />
                </>
            }
        >
            <p>
                These Terms of Service (the "<strong>Terms</strong>") govern access to and use of the App
                Deployer platform (the "<strong>Service</strong>"), published by <strong>Bambocloud</strong>,
                a limited liability company (the "<strong>Publisher</strong>"). By creating an account or
                using the Service, you agree to be bound by these Terms.
            </p>

            <h2>1. Description of the service</h2>
            <p>
                App Deployer is a deployment orchestration platform that lets you define command pipelines,
                manage environments, encrypted environment variables, SSH connections to your own servers,
                and trigger deployments manually or through webhooks (GitHub, GitLab, Bitbucket).
            </p>

            <h2>2. Accounts and access</h2>
            <p>
                You are responsible for keeping your login credentials confidential and for any activity
                carried out from your account. You must notify us promptly of any unauthorized use of your
                account. Access to an "Application" and its resources (servers, environments, pipelines)
                within a workspace is governed by the roles and permissions set by that workspace's
                administrators.
            </p>

            <h2>3. Your servers and your data</h2>
            <p>
                The Service runs commands that <strong>you</strong> configure, on servers that{' '}
                <strong>you</strong> own or control, using SSH credentials that you provide to us and that
                are stored encrypted. You are solely responsible for:
            </p>
            <ul>
                <li>the content and security of the commands executed in your pipelines;</li>
                <li>the legality and security of the applications and data deployed through the Service;</li>
                <li>the accuracy of the connection credentials provided to the platform.</li>
            </ul>
            <p>
                The Publisher only accesses your servers at the moment of a deployment you have explicitly
                triggered or configured (webhook), and has no standing access to your infrastructure.
            </p>

            <h2>4. Subscriptions and billing</h2>
            <p>
                Certain features of the Service are offered through paid plans, billed through our payment
                partner <strong>Paddle.com Market Limited</strong>, which acts as the official reseller
                (Merchant of Record) for App Deployer subscriptions. Your payment information is processed
                directly by Paddle; the Publisher never has access to your card data. Billing, renewal and
                cancellation terms are detailed in our{' '}
                <a href={route('legal.refunds.en')}>refund policy</a>.
            </p>
            <p>
                In the event of a failed payment, a 7-day grace period is granted before any paid features of
                your workspace are suspended.
            </p>

            <h2>5. Acceptable use</h2>
            <p>You agree not to use the Service to:</p>
            <ul>
                <li>host, deploy or distribute illegal, malicious or fraudulent content;</li>
                <li>
                    attempt unauthorized access to third-party systems, servers or accounts, including
                    through the Service;
                </li>
                <li>intentionally overload the Service's infrastructure (denial of service);</li>
                <li>circumvent the quotas or technical limitations of your plan.</li>
            </ul>
            <p>
                Any violation may result in the suspension or termination of your account, without notice in
                case of emergency (security, manifest illegality).
            </p>

            <h2>6. Availability and liability</h2>
            <p>
                The Service is provided "as is". The Publisher uses reasonable efforts to ensure its
                availability and reliability, but does not guarantee continuous, uninterrupted availability.
                To the extent permitted by applicable law, the Publisher shall not be liable for indirect
                damages resulting from the use or inability to use the Service, including in the event of a
                deployment failure on your own infrastructure.
            </p>

            <h2>7. Termination</h2>
            <p>
                You may delete your account at any time from your profile settings. The Publisher reserves
                the right to suspend or terminate an account in case of a breach of these Terms.
            </p>

            <h2>8. Changes to these Terms</h2>
            <p>
                These Terms may be updated from time to time. Any material change will be communicated to you
                by email or in-app notification before it takes effect.
            </p>

            <h2>9. Governing law</h2>
            <p>
                These Terms are governed by the laws applicable to the Publisher's registered office.
                Any dispute falls under the exclusive competence of the courts having jurisdiction over the
                Publisher's registered office, subject to any mandatory provisions applicable to consumers in
                your country of residence.
            </p>

            <h2>10. Contact</h2>
            <p>
                For any question regarding these Terms, contact us at{' '}
                <a href="mailto:contact@app-deployer.dev">contact@app-deployer.dev</a>.
            </p>
        </LegalLayout>
    );
}
