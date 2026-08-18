import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PRO_MONTHLY_PRICE_EUR, PRO_YEARLY_MONTHLY_EQUIVALENT_EUR, PRO_YEARLY_PRICE_EUR, PRO_YEARLY_SAVINGS_EUR } from '@/constants/pricing';
import { PageProps } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Alert, Button, Segmented, Tag, Tooltip, Typography, message } from 'antd';
import { Check, CalendarClock, History, Rocket, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { dateLocale } from '@/lib/i18n';

const { Title, Paragraph, Text } = Typography;

declare global {
    interface Window {
        Paddle?: {
            Environment: { set: (env: 'sandbox' | 'production') => void };
            Initialize: (options: { token: string; eventCallback?: (event: { name: string }) => void }) => void;
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
    max_workspaces: number | null;
}

interface BillingSubscription {
    status: 'active' | 'past_due' | 'canceled';
    is_comped: boolean;
    interval: 'monthly' | 'yearly' | null;
    grace_period_ends_at: string | null;
    renews_at: string | null;
}

type ProPlan = Pick<BillingPlan, 'slug' | 'name' | 'max_applications' | 'max_concurrent_deployments' | 'max_workspaces'> & {
    monthlyConfigured: boolean;
    yearlyConfigured: boolean;
};

export default function Show({
    plan,
    usage,
    subscription,
    freePlan,
    proPlan,
    can,
    paddle,
    billingHistory,
}: PageProps & {
    plan: BillingPlan;
    usage: { applications: number; workspaces: number };
    subscription: BillingSubscription | null;
    freePlan: BillingPlan;
    proPlan: ProPlan | null;
    can: { manageBilling: boolean };
    paddle: { client_token: string | null; sandbox: boolean };
    billingHistory: Array<{
        id: number;
        plan_name: string | null;
        plan_slug: string | null;
        status: string;
        interval: string | null;
        source: string;
        created_at: string;
    }>;
}) {
    const { t, i18n } = useTranslation('billing');
    const { workspace } = usePage<PageProps>().props;
    const [upgrading, setUpgrading] = useState(false);
    const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly');
    const paddleReady = useRef(false);

    const formatLimit = (value: number | null, singularUnitKey: string, pluralUnitKey: string) =>
        value === null
            ? t('features.unlimited', { unit: t(pluralUnitKey) })
            : t('features.count', { count: value, unit: t(value > 1 ? pluralUnitKey : singularUnitKey) });

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
            window.Paddle?.Initialize({
                token: paddle.client_token!,
                eventCallback: (event) => {
                    if (event.name === 'checkout.completed') {
                        setTimeout(() => router.reload({ only: ['plan', 'subscription', 'usage'] }), 2000);
                    }
                },
            });
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
            message.error(t('errors.notConfigured'));
            return;
        }

        setUpgrading(true);

        try {
            const { data } = await axios.post(route('billing.checkout', workspace!.slug), { interval });
            window.Paddle.Checkout.open({ transactionId: data.transaction_id });
        } catch (error) {
            const description =
                axios.isAxiosError(error) && error.response?.data?.message ? error.response.data.message : t('errors.checkoutFailed');
            message.error(description);
        } finally {
            setUpgrading(false);
        }
    };

    const intervalConfigured = interval === 'monthly' ? proPlan?.monthlyConfigured : proPlan?.yearlyConfigured;
    const upgradeDisabled = !can.manageBilling || upgrading || !intervalConfigured || !paddle.client_token;

    const upgradeTooltip = !can.manageBilling
        ? t('tooltip.ownerOnly')
        : !intervalConfigured || !paddle.client_token
          ? t('tooltip.notConfigured', { interval: t(interval === 'monthly' ? 'interval.monthlyLabel' : 'interval.yearlyLabel') })
          : null;

    const freeFeatures = [
        formatLimit(freePlan.max_workspaces, 'units.workspace', 'units.workspaces'),
        formatLimit(freePlan.max_applications, 'units.application', 'units.applications'),
        formatLimit(freePlan.max_concurrent_deployments, 'units.deployment', 'units.deployments'),
        t('plans.free.webhooks'),
        t('plans.free.history'),
        t('plans.free.logs'),
    ];

    const proFeatures = [
        t('plans.pro.allFreeFeatures'),
        formatLimit(proPlan?.max_workspaces ?? null, 'units.workspace', 'units.workspaces'),
        proPlan?.max_applications == null
            ? t('plans.pro.unlimitedApplications')
            : formatLimit(proPlan.max_applications, 'units.application', 'units.applications'),
        formatLimit(proPlan?.max_concurrent_deployments ?? null, 'units.deployment', 'units.deployments'),
        t('plans.pro.prioritySupport'),
    ];

    const upgradeButton = (
        <Button type="primary" size="large" block disabled={upgradeDisabled} loading={upgrading} onClick={startCheckout} icon={<Rocket size={16} />}>
            {t('plans.pro.upgradeButton', { name: proPlan?.name ?? t('plans.pro.name') })}
        </Button>
    );

    return (
        <AuthenticatedLayout header={t('meta.headerTitle')}>
            <Head title={t('meta.title')} />

            <div className="premium-list-hero">
                <div>
                    <div className="premium-list-eyebrow">{t('meta.eyebrow')}</div>
                    <Title level={2} style={{ margin: 0 }}>
                        {t('meta.title')}
                    </Title>
                    <Paragraph type="secondary" style={{ margin: '6px 0 0' }}>
                        {t('meta.subtitle')}
                    </Paragraph>
                </div>
            </div>

            {subscription?.status === 'past_due' && (
                <Alert
                    type="warning"
                    showIcon
                    style={{ marginBottom: 20 }}
                    message={t('pastDue.title')}
                    description={
                        daysLeft !== null ? t('pastDue.descriptionWithDays', { days: daysLeft }) : t('pastDue.description')
                    }
                />
            )}

            <div className="plans-toolbar">
                <Segmented
                    value={interval}
                    onChange={(value) => setInterval(value as 'monthly' | 'yearly')}
                    options={[
                        { label: t('interval.monthly'), value: 'monthly' },
                        { label: t('interval.yearly'), value: 'yearly' },
                    ]}
                    size="large"
                />
            </div>

            <div className="plans-grid">
                <div className={`plan-card ${isFree ? 'plan-card--current' : ''}`}>
                    {isFree && <div className="plan-card__badge">{t('plans.currentPlan')}</div>}

                    <div className="plan-card__head">
                        <Text className="plan-card__name">{t('plans.free.name')}</Text>
                        <div className="plan-card__price">
                            <span className="plan-card__price-amount">0€</span>
                            <span className="plan-card__price-period">{t('plans.free.perMonth')}</span>
                        </div>
                        <Paragraph type="secondary" className="plan-card__tagline">
                            {t('plans.free.tagline')}
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
                                {t('plans.free.currentButton')}
                            </Button>
                        ) : (
                            <Button size="large" block disabled>
                                {t('plans.free.includedButton')}
                            </Button>
                        )}
                    </div>
                </div>

                <div className={`plan-card plan-card--pro ${!isFree ? 'plan-card--current' : ''}`}>
                    {!isFree && <div className="plan-card__badge plan-card__badge--pro">{t('plans.currentPlan')}</div>}
                    {isFree && (
                        <div className="plan-card__ribbon">
                            <Sparkles size={13} /> {t('plans.pro.recommended')}
                        </div>
                    )}

                    <div className="plan-card__head">
                        <Text className="plan-card__name">{proPlan?.name ?? t('plans.pro.name')}</Text>
                        <div className="plan-card__price">
                            <span className="plan-card__price-amount">
                                {interval === 'monthly' ? PRO_MONTHLY_PRICE_EUR : PRO_YEARLY_MONTHLY_EQUIVALENT_EUR}€
                            </span>
                            <span className="plan-card__price-period">
                                {t('plans.pro.perMonth')}
                                {interval === 'yearly' ? t('plans.pro.perMonthYearlySuffix') : ''}
                            </span>
                        </div>
                        {interval === 'yearly' && (
                            <Text className="plan-card__price-note">
                                {t('plans.pro.yearlyNote', { price: PRO_YEARLY_PRICE_EUR, savings: PRO_YEARLY_SAVINGS_EUR })}
                            </Text>
                        )}
                        <Paragraph type="secondary" className="plan-card__tagline">
                            {t('plans.pro.tagline')}
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
                                    t('plans.pro.compedButton')
                                ) : (
                                    t('plans.pro.currentButton')
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <div className="billing-usage-card">
                <Title level={5} style={{ margin: '0 0 16px' }}>
                    {t('usage.title')}
                </Title>
                <div className="billing-usage-card__grid">
                    <div>
                        <Text type="secondary">{t('usage.workspaces')}</Text>
                        <Paragraph style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 600 }}>
                            {usage.workspaces} / {plan.max_workspaces ?? '∞'}
                        </Paragraph>
                    </div>
                    <div>
                        <Text type="secondary">{t('usage.applications')}</Text>
                        <Paragraph style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 600 }}>
                            {usage.applications} / {plan.max_applications ?? '∞'}
                        </Paragraph>
                    </div>
                    <div>
                        <Text type="secondary">{t('usage.deploymentsAllowed')}</Text>
                        <Paragraph style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 600 }}>
                            {plan.max_concurrent_deployments ?? t('usage.unlimited')}
                        </Paragraph>
                    </div>
                </div>
            </div>

            {subscription && subscription.status === 'active' && !subscription.is_comped && subscription.renews_at && (
                <div className="billing-usage-card" style={{ marginTop: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <CalendarClock size={16} />
                        <Title level={5} style={{ margin: 0 }}>{t('nextBilling.title')}</Title>
                    </div>
                    <Text>
                        {t('nextBilling.description', {
                            date: new Date(subscription.renews_at).toLocaleDateString(dateLocale(i18n.language), { day: 'numeric', month: 'long', year: 'numeric' }),
                            interval: t(`interval.${subscription.interval ?? 'monthly'}Label`),
                        })}
                    </Text>
                </div>
            )}

            {billingHistory.length > 0 && (
                <div className="billing-usage-card" style={{ marginTop: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                        <History size={16} />
                        <Title level={5} style={{ margin: 0 }}>{t('history.title')}</Title>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {billingHistory.map((entry) => (
                            <div key={entry.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Tag color={entry.plan_slug === 'pro' ? 'purple' : 'default'} style={{ margin: 0 }}>
                                        {entry.plan_name ?? '—'}
                                    </Tag>
                                    {entry.interval && (
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            {t(`interval.${entry.interval}Label`)}
                                        </Text>
                                    )}
                                    <Tag color={entry.status === 'active' ? 'success' : entry.status === 'canceled' ? 'error' : 'warning'} style={{ margin: 0 }}>
                                        {t(`history.status.${entry.status}`, { defaultValue: entry.status })}
                                    </Tag>
                                </div>
                                <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                                    {new Date(entry.created_at).toLocaleDateString(dateLocale(i18n.language), { day: 'numeric', month: 'short', year: 'numeric' })}
                                </Text>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <Paragraph type="secondary" style={{ marginTop: 24, fontSize: 12 }}>
                {t('footer.prefix')}
                <Link href={route('legal.terms')}>{t('footer.termsLink')}</Link>
                {t('footer.middle')}
                <Link href={route('legal.refunds')}>{t('footer.refundsLink')}</Link>
                {t('footer.suffix')}
            </Paragraph>
        </AuthenticatedLayout>
    );
}
