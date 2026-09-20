import MarketingLayout from '@/Layouts/MarketingLayout';
import { freeFeatures, proFeatures, type PlanLimits } from '@/constants/marketing';
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
        question: 'Puis-je changer de plan à tout moment ?',
        answer: "Oui. Vous pouvez passer de Free à Pro (ou inversement) depuis la page de facturation de votre workspace, sans interruption de service.",
    },
    {
        question: "Comment fonctionne la facturation annuelle ?",
        answer: `L'offre annuelle facture ${pricing.yearly}${pricing.symbol} une fois par an au lieu de ${pricing.monthly}${pricing.symbol}/mois, soit ${pricing.yearlySavings}${pricing.symbol} d'économie sur l'année par rapport à la facturation mensuelle.`,
    },
    {
        question: 'Puis-je annuler à tout moment ?',
        answer: "Oui, sans engagement. L'abonnement reste actif jusqu'à la fin de la période déjà payée — voir notre politique de remboursement pour le détail.",
    },
    {
        question: 'Qui gère le paiement ?',
        answer: "Paddle.com Market Limited, notre revendeur officiel (Merchant of Record), gère l'ensemble du paiement et de la facturation en notre nom.",
    },
];

export default function Tarifs({ plans, prices }: PricingProps) {
    const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly');
    const pricing = proPricing(prices);
    const faq = buildFaq(pricing);
    const free = freeFeatures(plans?.free ?? null);
    const pro = proFeatures(plans?.pro ?? null);
    const concurrency = plans?.pro?.max_concurrent_deployments;

    return (
        <MarketingLayout
            title="Tarifs — Free et Pro"
            description={`Les tarifs App Deployer : commencez gratuitement avec le plan Free, passez à Pro pour des applications illimitées${concurrency ? ` et jusqu'à ${concurrency} déploiements simultanés` : ''}. Sans engagement.`}
            breadcrumbs={[{ label: 'Tarifs' }]}
            locale="fr"
            altLocaleHref="/pricing"
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
                                description:
                                    "Plateforme d'orchestration de déploiements applicatifs.",
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
                                        priceCurrency: prices?.monthly?.currency ?? 'EUR',
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
                <h1>Un tarif simple, sans surprise</h1>
                <p>Commencez gratuitement. Passez à Pro quand votre équipe grandit — annulez à tout moment.</p>
            </div>

            <section className="landing-section">
                <div className="plans-toolbar">
                    <Segmented
                        value={interval}
                        onChange={(value) => setInterval(value as 'monthly' | 'yearly')}
                        options={[
                            { label: 'Mensuel', value: 'monthly' },
                            { label: `Annuel — économisez ${pricing.yearlySavings}${pricing.symbol}`, value: 'yearly' },
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
                                <span className="plan-card__price-period">/ mois</span>
                            </div>
                            <p className="plan-card__tagline">
                                Pour découvrir la plateforme et déployer votre premier projet, sans engagement.
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
                                    Commencer gratuitement
                                </Button>
                            </Link>
                        </div>
                    </div>

                    <div className="plan-card plan-card--pro">
                        <div className="plan-card__ribbon">
                            <Sparkles size={13} /> Le plus populaire
                        </div>

                        <div className="plan-card__head">
                            <span className="plan-card__name">Pro</span>
                            <div className="plan-card__price">
                                <span className="plan-card__price-amount">
                                    {interval === 'monthly' ? pricing.monthly : pricing.yearlyMonthlyEquivalent}
                                    {pricing.symbol}
                                </span>
                                <span className="plan-card__price-period">
                                    / mois{interval === 'yearly' ? ', facturé annuellement' : ''}
                                </span>
                            </div>
                            {interval === 'yearly' && (
                                <span className="plan-card__price-note">
                                    {pricing.yearly}{pricing.symbol} facturés une fois par an au lieu de {pricing.twelveMonths}{pricing.symbol}
                                </span>
                            )}
                            <p className="plan-card__tagline">
                                Pour les équipes qui déploient en production, sans limite ni compromis.
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
                                    Essayer Pro
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>

                <p className="landing-pricing-note">
                    Les prix sont hors taxes. Paiement sécurisé par Paddle, notre revendeur officiel — voir notre{' '}
                    <Link href={route('legal.refunds')}>politique de remboursement</Link>.
                </p>
            </section>

            <section className="legal-content" style={{ maxWidth: 720, padding: '0 20px 64px' }}>
                <h2>Questions fréquentes</h2>
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
