import MarketingLayout from '@/Layouts/MarketingLayout';
import { STEPS } from '@/constants/marketing';
import { Link } from '@inertiajs/react';
import { Button } from 'antd';
import { ArrowRight } from 'lucide-react';

export default function CommentCaMarche() {
    return (
        <MarketingLayout
            title="Comment ça marche — De l'inscription au déploiement"
            description="Comment fonctionne App Deployer : créez votre workspace, configurez vos serveurs et vos pipelines, puis déployez manuellement ou via webhook avec un suivi en temps réel."
            breadcrumbs={[{ label: 'Comment ça marche' }]}
            headChildren={
                <script type="application/ld+json">
                    {JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'HowTo',
                        name: 'Comment déployer avec App Deployer',
                        description:
                            "Les trois étapes pour passer de l'inscription à votre premier déploiement supervisé.",
                        step: STEPS.map(({ title, detail }) => ({
                            '@type': 'HowToStep',
                            name: title,
                            text: detail,
                        })),
                    })}
                </script>
            }
        >
            <div className="landing-page-header">
                <h1>Opérationnel en trois étapes</h1>
                <p>Aucune configuration lourde : votre premier déploiement peut avoir lieu aujourd'hui.</p>
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
                            Créer mon workspace
                            <ArrowRight size={16} />
                        </Button>
                    </Link>
                </div>
            </section>
        </MarketingLayout>
    );
}
