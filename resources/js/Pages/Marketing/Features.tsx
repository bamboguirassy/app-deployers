import MarketingLayout from '@/Layouts/MarketingLayout';
import { FEATURES } from '@/constants/marketing.en';
import { Link } from '@inertiajs/react';
import { Button } from 'antd';
import { ArrowRight } from 'lucide-react';

export default function Features() {
    return (
        <MarketingLayout
            title="Features — Pipelines, SSH, webhooks and live tracking"
            description="Explore App Deployer's features: custom deployment pipelines, encrypted SSH connections, secret variables, GitHub/GitLab/Bitbucket webhooks, live tracking and team roles."
            breadcrumbs={[{ label: 'Features' }]}
            locale="en"
            altLocaleHref="/fonctionnalites"
            headChildren={
                <>
                    <link rel="alternate" hrefLang="en" href="/features" />
                    <link rel="alternate" hrefLang="fr" href="/fonctionnalites" />
                    <link rel="alternate" hrefLang="x-default" href="/features" />
                </>
            }
        >
            <div className="landing-page-header">
                <h1>Everything you need to deploy with peace of mind</h1>
                <p>
                    App Deployer orchestrates the entire lifecycle of your deployments: from defining the
                    pipeline to the audit trail, through securely connecting to your servers and tracking
                    every run in real time.
                </p>
            </div>

            <section className="landing-section">
                <div className="landing-features">
                    {FEATURES.map(({ icon: Icon, title, detail }) => (
                        <div className="landing-feature-card" key={title}>
                            <div className="landing-feature-card__icon">
                                <Icon size={20} />
                            </div>
                            <h2>{title}</h2>
                            <p>{detail}</p>
                        </div>
                    ))}
                </div>

                <div className="landing-page-cta">
                    <Link href={route('register')}>
                        <Button type="primary" size="large">
                            Create my workspace
                            <ArrowRight size={16} />
                        </Button>
                    </Link>
                </div>
            </section>
        </MarketingLayout>
    );
}
