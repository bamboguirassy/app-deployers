import CatalogSection from '@/Components/Welcome/CatalogSection';
import MarketingLayout from '@/Layouts/MarketingLayout';
import { Link } from '@inertiajs/react';
import { Button } from 'antd';
import {
    ArrowRight,
    GitBranch,
    Radio,
    ShieldCheck,
    Sparkles,
} from 'lucide-react';

const TEASERS = [
    {
        icon: GitBranch,
        title: 'Features',
        description:
            'Custom pipelines, encrypted SSH connections, Git webhooks, live tracking, team roles and an audit trail.',
        href: '/features',
    },
    {
        icon: Radio,
        title: 'How it works',
        description:
            'From sign-up to your first supervised deployment: three steps, no heavy setup.',
        href: '/how-it-works',
    },
    {
        icon: ShieldCheck,
        title: 'Security',
        description:
            'Your servers stay yours: encrypted, ephemeral SSH connections and secrets isolated per environment.',
        href: '/security',
    },
    {
        icon: Sparkles,
        title: 'Pricing',
        description:
            'Start for free, upgrade to Pro as your team grows — no commitment.',
        href: '/pricing',
    },
];

export default function Welcome() {
    return (
        <MarketingLayout
            title="App Deployer — Deployment supervision and automation"
            description="App Deployer orchestrates your deployment pipelines, environments (Production, Staging…) and teams from a single platform, with live tracking, Git webhooks and encrypted SSH connections."
            locale="en"
            altLocaleHref="/fr"
            headChildren={
                <>
                    <link rel="alternate" hrefLang="en" href="/" />
                    <link rel="alternate" hrefLang="fr" href="/fr" />
                    <link rel="alternate" hrefLang="x-default" href="/" />
                    <script type="application/ld+json">
                        {JSON.stringify({
                            '@context': 'https://schema.org',
                            '@type': 'SoftwareApplication',
                            name: 'App Deployer',
                            applicationCategory: 'DeveloperApplication',
                            operatingSystem: 'Web',
                            description:
                                'App Deployer orchestrates your deployment pipelines, environments and teams from a single platform.',
                            offers: {
                                '@type': 'Offer',
                                price: '0',
                                priceCurrency: 'EUR',
                            },
                        })}
                    </script>
                </>
            }
        >
            <section className="landing-hero">
                <div className="landing-hero__copy">
                    <span className="landing-badge">Hosted platform · Your servers, your control</span>
                    <h1>
                        Deploy your applications
                        <br />
                        with confidence.
                    </h1>
                    <p>
                        App Deployer orchestrates your deployment pipelines,
                        environments and teams from one place — with live
                        tracking and simplified rollback.
                    </p>
                    <div className="landing-hero__actions">
                        <Link href={route('register')}>
                            <Button type="primary" size="large">
                                Create my workspace
                                <ArrowRight size={16} />
                            </Button>
                        </Link>
                        <Link href="/features">
                            <Button size="large" type="default">
                                Discover the features
                            </Button>
                        </Link>
                    </div>
                    <ul className="landing-hero__chips">
                        <li>Multi-environment</li>
                        <li>Git webhooks</li>
                        <li>Fast rollback</li>
                        <li>Live logs</li>
                    </ul>
                </div>

                <div className="landing-hero__visual" aria-hidden="true">
                    <div className="mock-window">
                        <div className="mock-window__bar">
                            <span />
                            <span />
                            <span />
                        </div>
                        <div className="mock-window__body">
                            <div className="mock-row mock-row--succes">
                                <span className="mock-dot" />
                                <span>build</span>
                                <span className="mock-tag">success</span>
                            </div>
                            <div className="mock-row mock-row--succes">
                                <span className="mock-dot" />
                                <span>migrate</span>
                                <span className="mock-tag">success</span>
                            </div>
                            <div className="mock-row mock-row--running">
                                <span className="mock-dot" />
                                <span>restart-service</span>
                                <span className="mock-tag">running</span>
                            </div>
                            <div className="mock-row mock-row--pending">
                                <span className="mock-dot" />
                                <span>smoke-test</span>
                                <span className="mock-tag">pending</span>
                            </div>
                            <div className="mock-progress">
                                <div className="mock-progress__bar" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <CatalogSection locale="en" />

            <section className="landing-section">
                <div className="landing-section__header">
                    <h2>Everything you need to deploy with peace of mind</h2>
                    <p>
                        From defining the pipeline to the final audit trail,
                        App Deployer covers the whole lifecycle of your
                        deployments.
                    </p>
                </div>

                <div className="landing-teasers">
                    {TEASERS.map(({ icon: Icon, title, description, href }) => (
                        <Link href={href} className="landing-teaser-card" key={title}>
                            <div className="landing-teaser-card__icon">
                                <Icon size={20} />
                            </div>
                            <h3>{title}</h3>
                            <p>{description}</p>
                            <span className="landing-teaser-card__link">
                                Learn more <ArrowRight size={14} />
                            </span>
                        </Link>
                    ))}
                </div>
            </section>

            <section className="landing-cta">
                <h2>Ready to orchestrate your deployments?</h2>
                <p>Create your account and your workspace in under two minutes.</p>
                <Link href={route('register')}>
                    <Button type="primary" size="large">
                        Start for free
                        <ArrowRight size={16} />
                    </Button>
                </Link>
            </section>
        </MarketingLayout>
    );
}
