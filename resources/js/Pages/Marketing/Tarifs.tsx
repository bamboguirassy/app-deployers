import MarketingLayout from '@/Layouts/MarketingLayout';
import { FREE_FEATURES, PRO_FEATURES } from '@/constants/marketing';
import {
    PRO_MONTHLY_PRICE_EUR,
    PRO_YEARLY_MONTHLY_EQUIVALENT_EUR,
    PRO_YEARLY_PRICE_EUR,
    PRO_YEARLY_SAVINGS_EUR,
} from '@/constants/pricing';
import { Link } from '@inertiajs/react';
import { Button, Segmented } from 'antd';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import { useState } from 'react';

const FAQ = [
    {
        question: 'Puis-je changer de plan à tout moment ?',
        answer: "Oui. Vous pouvez passer de Free à Pro (ou inversement) depuis la page de facturation de votre workspace, sans interruption de service.",
    },
    {
        question: "Comment fonctionne la facturation annuelle ?",
        answer: `L'offre annuelle facture ${PRO_YEARLY_PRICE_EUR}€ une fois par an au lieu de ${PRO_MONTHLY_PRICE_EUR}€/mois, soit ${PRO_YEARLY_SAVINGS_EUR}€ d'économie sur l'année par rapport à la facturation mensuelle.`,
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

export default function Tarifs() {
    const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly');

    return (
        <MarketingLayout
            title="Tarifs — Free et Pro"
            description="Les tarifs App Deployer : commencez gratuitement avec le plan Free, passez à Pro pour des applications illimitées et jusqu'à 5 déploiements simultanés. Sans engagement."
            breadcrumbs={[{ label: 'Tarifs' }]}
            headChildren={
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
                                        price: String(PRO_MONTHLY_PRICE_EUR),
                                        priceCurrency: 'EUR',
                                    },
                                ],
                            },
                            {
                                '@type': 'FAQPage',
                                mainEntity: FAQ.map(({ question, answer }) => ({
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
                            { label: `Annuel — économisez ${PRO_YEARLY_SAVINGS_EUR}€`, value: 'yearly' },
                        ]}
                        size="large"
                    />
                </div>

                <div className="plans-grid">
                    <div className="plan-card">
                        <div className="plan-card__head">
                            <span className="plan-card__name">Free</span>
                            <div className="plan-card__price">
                                <span className="plan-card__price-amount">0€</span>
                                <span className="plan-card__price-period">/ mois</span>
                            </div>
                            <p className="plan-card__tagline">
                                Pour découvrir la plateforme et déployer votre premier projet, sans engagement.
                            </p>
                        </div>

                        <ul className="plan-card__features">
                            {FREE_FEATURES.map((feature) => (
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
                                    {interval === 'monthly' ? PRO_MONTHLY_PRICE_EUR : PRO_YEARLY_MONTHLY_EQUIVALENT_EUR}€
                                </span>
                                <span className="plan-card__price-period">
                                    / mois{interval === 'yearly' ? ', facturé annuellement' : ''}
                                </span>
                            </div>
                            {interval === 'yearly' && (
                                <span className="plan-card__price-note">
                                    {PRO_YEARLY_PRICE_EUR}€ facturés une fois par an au lieu de {PRO_MONTHLY_PRICE_EUR * 12}€
                                </span>
                            )}
                            <p className="plan-card__tagline">
                                Pour les équipes qui déploient en production, sans limite ni compromis.
                            </p>
                        </div>

                        <ul className="plan-card__features">
                            {PRO_FEATURES.map((feature) => (
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
                {FAQ.map(({ question, answer }) => (
                    <div key={question}>
                        <h3>{question}</h3>
                        <p>{answer}</p>
                    </div>
                ))}
            </section>
        </MarketingLayout>
    );
}
