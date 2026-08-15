import LegalLayout from '@/Layouts/LegalLayout';

export default function RefundsEn() {
    return (
        <LegalLayout
            title="Refund Policy"
            description="Refund policy for App Deployer subscriptions, billed through Paddle.com Market Limited: cancellation, refunds and renewal."
            updatedAt="August 12, 2026"
            locale="en"
            headChildren={
                <>
                    <link rel="alternate" hrefLang="en" href="/legal/refund-policy" />
                    <link rel="alternate" hrefLang="fr" href="/refunds" />
                    <link rel="alternate" hrefLang="x-default" href="/legal/refund-policy" />
                </>
            }
        >
            <p>
                Paid App Deployer subscriptions are billed by our partner{' '}
                <strong>Paddle.com Market Limited</strong>, which acts as the official reseller (Merchant of
                Record) for our plans. Paddle appears on your bank statements and handles the entire payment
                and refund process on our behalf.
            </p>

            <h2>1. Subscriptions and renewal</h2>
            <p>
                Subscriptions are billed in advance, monthly or annually depending on the plan chosen, and
                automatically renew at the end of each period unless cancelled beforehand. You can cancel
                your subscription at any time from your workspace billing page; the subscription stays active
                until the end of the period already paid for.
            </p>

            <h2>2. Grace period on failed payment</h2>
            <p>
                If a renewal payment fails (expired card, insufficient funds...), you are granted a{' '}
                <strong>7-day</strong> grace period to update your payment method, during which your plan's
                features remain active. If the issue is not resolved by the end of this period, your
                workspace is automatically switched back to the free plan.
            </p>

            <h2>3. Right of withdrawal and refund</h2>
            <p>
                If you reside in the European Union or in a jurisdiction offering a legal right of withdrawal
                for digital services, you have <strong>14 days</strong> from your first payment to request
                cancellation and a full refund of your subscription, provided you have not fully used the
                Service during that period in accordance with applicable provisions.
            </p>
            <p>
                Outside of this legal window, payments made for a subscription period already started are not
                refunded on a pro-rata basis, except in the following cases:
            </p>
            <ul>
                <li>
                    a prolonged, confirmed unavailability of the Service, attributable to the Publisher, that
                    significantly prevented use of your subscription;
                </li>
                <li>a billing error (double charge, incorrect amount);</li>
                <li>any other situation reviewed on a case-by-case basis, at our discretion.</li>
            </ul>

            <h2>4. How to request a refund</h2>
            <p>
                Any refund request should be sent to Paddle (which handles payment-related requests directly,
                as Merchant of Record) via{' '}
                <a href="https://www.paddle.com/help" target="_blank" rel="noreferrer">
                    their help center
                </a>
                , or to us at{' '}
                <a href="mailto:billing@app-deployer.dev">billing@app-deployer.dev</a>, specifying your
                account email address and the reason for the request. We process each request within 5
                business days.
            </p>

            <h2>5. Plan changes</h2>
            <p>
                Upgrading to a higher plan takes effect immediately, with a pro-rata adjustment for the
                current period. Downgrading to a lower plan takes effect at the end of the period already
                paid for, with no partial refund of the current period.
            </p>

            <h2>6. Contact</h2>
            <p>
                For any question about billing or refunds, contact us at{' '}
                <a href="mailto:billing@app-deployer.dev">billing@app-deployer.dev</a>.
            </p>
        </LegalLayout>
    );
}
