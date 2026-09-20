import MarketingLayout from '@/Layouts/MarketingLayout';
import { freeFeatures, proFeatures, type PlanLimits } from '@/constants/marketing.en';
import { proPricing, type ProPrices } from '@/constants/pricing';
import { Link } from '@inertiajs/react';
import { Button, Segmented } from 'antd';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import { useState } from 'react';

type PricingProps = {
    plans: { free: PlanLimits; pro: PlanLimits };
    prices: ProPrices;
};

const buildFaq = (pricing: ReturnType<typeof proPricing>) => [
    {
        question: 'Can I change plans at any time?',
        answer: 'Yes. You can switch from Free to Pro (or back) from your workspace billing page, with no service interruption.',
    },
    {
        question: 'How does annual billing work?',
        answer: `The annual plan bills ${pricing.yearly}${pricing.symbol} once a year instead of ${pricing.monthly}${pricing.symbol}/month, saving ${pricing.yearlySavings}${pricing.symbol} a year compared to monthly billing.`,
    },
    {
        question: 'Can I cancel at any time?',
        answer: "Yes, with no commitment. Your subscription stays active until the end of the period already paid for — see our refund policy for details.",
    },
    {
        question: 'Who handles payment?',
        answer: 'Paddle.com Market Limited, our official reseller (Merchant of Record), handles all payment and billing on our behalf.',
    },
];

export default function Pricing({ plans, prices }: PricingProps) {
    const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly');
    const pricing = proPricing(prices);
    const faq = buildFaq(pricing);
    const free = freeFeatures(plans?.free ?? null);
    const pro = proFeatures(plans?.pro ?? null);
    const concurrency = plans?.pro?.max_concurrent_deployments;

    return (
        <MarketingLayout
            title="Pricing — Free and Pro"
            description={`App Deployer pricing: start for free with the Free plan, upgrade to Pro for unlimited applications${concurrency ? ` and up to ${concurrency} concurrent deployments` : ''}. No commitment.`}
            breadcrumbs={[{ label: 'Pricing' }]}
            locale="en"
            altLocaleHref="/tarifs"
            headChildren={
                <>
                    <link rel="alternate" hrefLang="en" href="/pricing" />
                    <link rel="alternate" hrefLang="fr" href="/tarifs" />
                    <link rel="alternate" hrefLang="x-default" href="/pricing" />
                    <script type="application/ld+json">
                        {JSON.stringify({
                            '@context': 'https://schema.org',
                            '@graph': [
                                {
                                    '@type': 'Product',
                                    name: 'App Deployer',
                                    description: 'Deployment orchestration platform.',
                                    offers: [
                                        {
                                            '@type': 'Offer',
                                            name: 'Free',
                                            price: '0',
                                            priceCurrency: 'EUR',
                                        },
                                        {
                                            '@type': 'Offer',
                                            name: 'Pro',
                                            price: String(pricing.monthly),
                                            priceCurrency: 'EUR',
                                        },
                                    ],
                                },
                                {
                                    '@type': 'FAQPage',
                                    mainEntity: faq.map(({ question, answer }) => ({
                                        '@type': 'Question',
                                        name: question,
                                        acceptedAnswer: {
                                            '@type': 'Answer',
                                            text: answer,
                                        },
                                    })),
                                },
                            ],
                        })}
                    </script>
                </>
            }
        >
            <div className="landing-page-header">
                <h1>Simple pricing, no surprises</h1>
                <p>Start for free. Upgrade to Pro as your team grows — cancel any time.</p>
            </div>

            <section className="landing-section">
                <div className="plans-toolbar">
                    <Segmented
                        value={interval}
                        onChange={(value) => setInterval(value as 'monthly' | 'yearly')}
                        options={[
                            { label: 'Monthly', value: 'monthly' },
                            { label: `Yearly — save ${pricing.yearlySavings}${pricing.symbol}`, value: 'yearly' },
                        ]}
                        size="large"
                    />
                </div>

                <div className="plans-grid">
                    <div className="plan-card">
                        <div className="plan-card__head">
                            <span className="plan-card__name">Free</span>
                            <div className="plan-card__price">
                                <span className="plan-card__price-amount">0{pricing.symbol}</span>
                                <span className="plan-card__price-period">/ month</span>
                            </div>
                            <p className="plan-card__tagline">
                                To try the platform and deploy your first project, no commitment.
                            </p>
                        </div>

                        <ul className="plan-card__features">
                            {free.map((feature) => (
                                <li key={feature}>
                                    <Check size={16} />
                                    <span>{feature}</span>
                                </li>
                            ))}
                        </ul>

                        <div className="plan-card__cta">
                            <Link href={route('register')}>
                                <Button size="large" block>
                                    Start for free
                                </Button>
                            </Link>
                        </div>
                    </div>

                    <div className="plan-card plan-card--pro">
                        <div className="plan-card__ribbon">
                            <Sparkles size={13} /> Most popular
                        </div>

                        <div className="plan-card__head">
                            <span className="plan-card__name">Pro</span>
                            <div className="plan-card__price">
                                <span className="plan-card__price-amount">
                                    {interval === 'monthly' ? pricing.monthly : pricing.yearlyMonthlyEquivalent}
                                    {pricing.symbol}
                                </span>
                                <span className="plan-card__price-period">
                                    / month{interval === 'yearly' ? ', billed annually' : ''}
                                </span>
                            </div>
                            {interval === 'yearly' && (
                                <span className="plan-card__price-note">
                                    {pricing.yearly}{pricing.symbol} billed once a year instead of {pricing.twelveMonths}{pricing.symbol}
                                </span>
                            )}
                            <p className="plan-card__tagline">
                                For teams deploying to production, with no limits or compromises.
                            </p>
                        </div>

                        <ul className="plan-card__features">
                            {pro.map((feature) => (
                                <li key={feature}>
                                    <Check size={16} />
                                    <span>{feature}</span>
                                </li>
                            ))}
                        </ul>

                        <div className="plan-card__cta">
                            <Link href={route('register')}>
                                <Button type="primary" size="large" block icon={<ArrowRight size={16} />} iconPlacement="end">
                                    Try Pro
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>

                <p className="landing-pricing-note">
                    Prices exclude tax. Secure payment by Paddle, our official reseller — see our{' '}
                    <Link href={route('legal.refunds.en')}>refund policy</Link>.
                </p>
            </section>

            <section className="legal-content" style={{ maxWidth: 720, padding: '0 20px 64px' }}>
                <h2>Frequently asked questions</h2>
                {faq.map(({ question, answer }) => (
                    <div key={question}>
                        <h3>{question}</h3>
                        <p>{answer}</p>
                    </div>
                ))}
            </section>
        </MarketingLayout>
    );
}
