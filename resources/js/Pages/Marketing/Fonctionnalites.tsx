import MarketingLayout from '@/Layouts/MarketingLayout';
import { FEATURES } from '@/constants/marketing';
import { Link } from '@inertiajs/react';
import { Button } from 'antd';
import { ArrowRight } from 'lucide-react';

export default function Fonctionnalites() {
    return (
        <MarketingLayout
            title="Fonctionnalités — Pipelines, SSH, webhooks et suivi en direct"
            description="Découvrez les fonctionnalités d'App Deployer : pipelines de déploiement sur mesure, connexions SSH chiffrées, variables secrètes, webhooks GitHub/GitLab/Bitbucket, suivi en direct et rôles par équipe."
            breadcrumbs={[{ label: 'Fonctionnalités' }]}
        >
            <div className="landing-page-header">
                <h1>Tout ce qu'il faut pour déployer sereinement</h1>
                <p>
                    App Deployer orchestre l'intégralité du cycle de vie de vos déploiements : de la définition du
                    pipeline jusqu'au journal d'audit, en passant par la connexion sécurisée à vos serveurs et le
                    suivi en temps réel de chaque exécution.
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
                            Créer mon workspace
                            <ArrowRight size={16} />
                        </Button>
                    </Link>
                </div>
            </section>
        </MarketingLayout>
    );
}
