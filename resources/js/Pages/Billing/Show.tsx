import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PRO_MONTHLY_PRICE_EUR, PRO_YEARLY_MONTHLY_EQUIVALENT_EUR, PRO_YEARLY_PRICE_EUR, PRO_YEARLY_SAVINGS_EUR } from '@/constants/pricing';
import { PageProps } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { Alert, Button, Segmented, Tooltip, Typography, message } from 'antd';
import { Check, Rocket, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';

const { Title, Paragraph, Text } = Typography;

declare global {
    interface Window {
        Paddle?: {
            Environment: { set: (env: 'sandbox' | 'production') => void };
            Initialize: (options: { token: string }) => void;
            Checkout: { open: (options: { transactionId: string }) => void };
        };
    }
}

const PADDLE_JS_URL = 'https://cdn.paddle.com/paddle/v2/paddle.js';

interface BillingPlan {
    slug: string;
    name: string;
    max_applications: number | null;
    max_concurrent_deployments: number | null;
}

interface BillingSubscription {
    status: 'active' | 'past_due' | 'canceled';
    is_comped: boolean;
    interval: 'monthly' | 'yearly' | null;
    grace_period_ends_at: string | null;
    renews_at: string | null;
}

type ProPlan = Pick<BillingPlan, 'slug' | 'name' | 'max_applications' | 'max_concurrent_deployments'> & {
    monthlyConfigured: boolean;
    yearlyConfigured: boolean;
};

const formatLimit = (value: number | null, singular: string, plural: string) =>
    value === null ? `${plural} illimité(e)s` : `${value} ${value > 1 ? plural : singular}`;

export default function Show({
    plan,
    usage,
    subscription,
    freePlan,
    proPlan,
    can,
    paddle,
}: {
    plan: BillingPlan;
    usage: { applications: number };
    subscription: BillingSubscription | null;
    freePlan: BillingPlan;
    proPlan: ProPlan | null;
    can: { manageBilling: boolean };
    paddle: { client_token: string | null; sandbox: boolean };
}) {
    const { workspace } = usePage<PageProps>().props;
    const [upgrading, setUpgrading] = useState(false);
    const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly');
    const paddleReady = useRef(false);

    // Paddle.js n'est chargé que sur cette page (pas globalement) : c'est la
    // seule qui en a besoin.
    useEffect(() => {
        if (!paddle.client_token || paddleReady.current) {
            return;
        }

        const initialize = () => {
            if (paddle.sandbox) {
                window.Paddle?.Environment.set('sandbox');
            }
            window.Paddle?.Initialize({ token: paddle.client_token! });
            paddleReady.current = true;
        };

        if (window.Paddle) {
            initialize();
            return;
        }

        const script = document.createElement('script');
        script.src = PADDLE_JS_URL;
        script.async = true;
        script.onload = initialize;
        document.body.appendChild(script);
    }, [paddle.client_token, paddle.sandbox]);

    const isFree = plan.slug === 'free';
    const daysLeft = subscription?.grace_period_ends_at
        ? Math.max(0, Math.ceil((new Date(subscription.grace_period_ends_at).getTime() - Date.now()) / 86_400_000))
        : null;

    const startCheckout = async () => {
        if (!paddle.client_token || !window.Paddle) {
            message.error("La facturation en ligne n'est pas encore configurée. Contactez le support.");
            return;
        }

        setUpgrading(true);

        try {
            const { data } = await axios.post(route('billing.checkout', workspace!.slug), { interval });
            window.Paddle.Checkout.open({ transactionId: data.transaction_id });
        } catch (error) {
            const description =
                axios.isAxiosError(error) && error.response?.data?.message
                    ? error.response.data.message
                    : 'Impossible de lancer le paiement pour le moment.';
            message.error(description);
        } finally {
            setUpgrading(false);
        }
    };

    const intervalConfigured = interval === 'monthly' ? proPlan?.monthlyConfigured : proPlan?.yearlyConfigured;
    const upgradeDisabled = !can.manageBilling || upgrading || !intervalConfigured || !paddle.client_token;

    const upgradeTooltip = !can.manageBilling
        ? 'Seul le owner du workspace peut changer de plan'
        : !intervalConfigured || !paddle.client_token
          ? `La facturation ${interval === 'monthly' ? 'mensuelle' : 'annuelle'} n'est pas encore configurée pour ce plan`
          : null;

    const freeFeatures = [
        formatLimit(freePlan.max_applications, 'application', 'applications'),
        formatLimit(freePlan.max_concurrent_deployments, 'déploiement simultané', 'déploiements simultanés'),
        'Webhooks Git (GitHub, GitLab, Bitbucket)',
        'Historique de déploiement',
        'Logs en direct',
    ];

    const proFeatures = [
        'Toutes les fonctionnalités du plan Free',
        proPlan?.max_applications == null ? 'Applications illimitées' : formatLimit(proPlan.max_applications, 'application', 'applications'),
        formatLimit(proPlan?.max_concurrent_deployments ?? null, 'déploiement simultané', 'déploiements simultanés'),
        'Support prioritaire',
    ];

    const upgradeButton = (
        <Button type="primary" size="large" block disabled={upgradeDisabled} loading={upgrading} onClick={startCheckout} icon={<Rocket size={16} />}>
            Passer à {proPlan?.name ?? 'Pro'}
        </Button>
    );

    return (
        <AuthenticatedLayout header="Facturation">
            <Head title="Facturation" />

            <div className="premium-list-hero">
                <div>
                    <div className="premium-list-eyebrow">Workspace</div>
                    <Title level={2} style={{ margin: 0 }}>
                        Facturation
                    </Title>
                    <Paragraph type="secondary" style={{ margin: '6px 0 0' }}>
                        Choisissez le plan adapté à votre équipe. Changez à tout moment.
                    </Paragraph>
                </div>
            </div>

            {subscription?.status === 'past_due' && (
                <Alert
                    type="warning"
                    showIcon
                    style={{ marginBottom: 20 }}
                    message="Échec de paiement"
                    description={
                        daysLeft !== null
                            ? `Votre dernier paiement a échoué. Vous gardez votre plan actuel encore ${daysLeft} jour(s) avant un retour automatique au plan Free.`
                            : 'Votre dernier paiement a échoué.'
                    }
                />
            )}

            <div className="plans-toolbar">
                <Segmented
                    value={interval}
                    onChange={(value) => setInterval(value as 'monthly' | 'yearly')}
                    options={[
                        { label: 'Mensuel', value: 'monthly' },
                        { label: 'Annuel — 2 mois offerts', value: 'yearly' },
                    ]}
                    size="large"
                />
            </div>

            <div className="plans-grid">
                <div className={`plan-card ${isFree ? 'plan-card--current' : ''}`}>
                    {isFree && <div className="plan-card__badge">Plan actuel</div>}

                    <div className="plan-card__head">
                        <Text className="plan-card__name">Free</Text>
                        <div className="plan-card__price">
                            <span className="plan-card__price-amount">0€</span>
                            <span className="plan-card__price-period">/ mois</span>
                        </div>
                        <Paragraph type="secondary" className="plan-card__tagline">
                            Pour découvrir la plateforme et déployer votre premier projet.
                        </Paragraph>
                    </div>

                    <ul className="plan-card__features">
                        {freeFeatures.map((feature) => (
                            <li key={feature}>
                                <Check size={16} />
                                <span>{feature}</span>
                            </li>
                        ))}
                    </ul>

                    <div className="plan-card__cta">
                        {isFree ? (
                            <Button size="large" block disabled>
                                Plan actuel
                            </Button>
                        ) : (
                            <Button size="large" block disabled>
                                Inclus dans votre plan
                            </Button>
                        )}
                    </div>
                </div>

                <div className={`plan-card plan-card--pro ${!isFree ? 'plan-card--current' : ''}`}>
                    {!isFree && <div className="plan-card__badge plan-card__badge--pro">Plan actuel</div>}
                    {isFree && (
                        <div className="plan-card__ribbon">
                            <Sparkles size={13} /> Recommandé
                        </div>
                    )}

                    <div className="plan-card__head">
                        <Text className="plan-card__name">{proPlan?.name ?? 'Pro'}</Text>
                        <div className="plan-card__price">
                            <span className="plan-card__price-amount">
                                {interval === 'monthly' ? PRO_MONTHLY_PRICE_EUR : PRO_YEARLY_MONTHLY_EQUIVALENT_EUR}€
                            </span>
                            <span className="plan-card__price-period">/ mois{interval === 'yearly' ? ', facturé annuellement' : ''}</span>
                        </div>
                        {interval === 'yearly' && (
                            <Text className="plan-card__price-note">
                                {PRO_YEARLY_PRICE_EUR}€ facturés une fois par an — économisez {PRO_YEARLY_SAVINGS_EUR}€ vs mensuel
                            </Text>
                        )}
                        <Paragraph type="secondary" className="plan-card__tagline">
                            Pour les équipes qui déploient en production, sans limite.
                        </Paragraph>
                    </div>

                    <ul className="plan-card__features">
                        {proFeatures.map((feature) => (
                            <li key={feature}>
                                <Check size={16} />
                                <span>{feature}</span>
                            </li>
                        ))}
                    </ul>

                    <div className="plan-card__cta">
                        {isFree ? (
                            upgradeTooltip ? (
                                <Tooltip title={upgradeTooltip}>
                                    <span style={{ display: 'block' }}>{upgradeButton}</span>
                                </Tooltip>
                            ) : (
                                upgradeButton
                            )
                        ) : (
                            <Button size="large" block disabled>
                                {subscription?.is_comped ? (
                                    'Plan actuel — offert par notre équipe'
                                ) : (
                                    <>
                                        Plan actuel
                                        {subscription?.renews_at && subscription.status === 'active' && (
                                            <> — renouvellement le {new Date(subscription.renews_at).toLocaleDateString('fr-FR')}</>
                                        )}
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <div className="billing-usage-card">
                <Title level={5} style={{ margin: '0 0 16px' }}>
                    Utilisation actuelle
                </Title>
                <div className="billing-usage-card__grid">
                    <div>
                        <Text type="secondary">Applications</Text>
                        <Paragraph style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 600 }}>
                            {usage.applications} / {plan.max_applications ?? '∞'}
                        </Paragraph>
                    </div>
                    <div>
                        <Text type="secondary">Déploiements simultanés autorisés</Text>
                        <Paragraph style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 600 }}>
                            {plan.max_concurrent_deployments ?? 'Illimité'}
                        </Paragraph>
                    </div>
                </div>
            </div>

            <Paragraph type="secondary" style={{ marginTop: 24, fontSize: 12 }}>
                Le passage à un plan payant est facturé par notre partenaire Paddle. En souscrivant, vous acceptez
                nos <Link href={route('legal.terms')}>conditions d'utilisation</Link> et notre{' '}
                <Link href={route('legal.refunds')}>politique de remboursement</Link>.
            </Paragraph>
        </AuthenticatedLayout>
    );
}
