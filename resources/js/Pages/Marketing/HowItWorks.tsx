import MarketingLayout from '@/Layouts/MarketingLayout';
import { STEPS } from '@/constants/marketing.en';
import { Link } from '@inertiajs/react';
import { Button } from 'antd';
import { ArrowRight } from 'lucide-react';

export default function HowItWorks() {
    return (
        <MarketingLayout
            title="How it works — From sign-up to deployment"
            description="How App Deployer works: create your workspace, configure your servers and pipelines, then deploy manually or via webhook with real-time tracking."
            breadcrumbs={[{ label: 'How it works' }]}
            locale="en"
            altLocaleHref="/comment-ca-marche"
            headChildren={
                <>
                    <link rel="alternate" hrefLang="en" href="/how-it-works" />
                    <link rel="alternate" hrefLang="fr" href="/comment-ca-marche" />
                    <link rel="alternate" hrefLang="x-default" href="/how-it-works" />
                    <script type="application/ld+json">
                        {JSON.stringify({
                            '@context': 'https://schema.org',
                            '@type': 'HowTo',
                            name: 'How to deploy with App Deployer',
                            description:
                                'The three steps from sign-up to your first supervised deployment.',
                            step: STEPS.map(({ title, detail }) => ({
                                '@type': 'HowToStep',
                                name: title,
                                text: detail,
                            })),
                        })}
                    </script>
                </>
            }
        >
            <div className="landing-page-header">
                <h1>Up and running in three steps</h1>
                <p>No heavy setup: your first deployment can happen today.</p>
            </div>

            <section className="landing-section">
                <div className="landing-steps">
                    {STEPS.map((step, index) => (
                        <div className="landing-step" key={step.title}>
                            <span className="landing-step__number">{index + 1}</span>
                            <h2>{step.title}</h2>
                            <p>{step.detail}</p>
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
