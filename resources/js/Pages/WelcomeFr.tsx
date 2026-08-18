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
        title: 'Fonctionnalités',
        description:
            "Pipelines sur mesure, connexions SSH chiffrées, webhooks Git, suivi en direct, rôles par équipe et journal d'audit.",
        href: '/fonctionnalites',
    },
    {
        icon: Radio,
        title: 'Comment ça marche',
        description:
            "De l'inscription à votre premier déploiement supervisé : trois étapes, sans configuration lourde.",
        href: '/comment-ca-marche',
    },
    {
        icon: ShieldCheck,
        title: 'Sécurité',
        description:
            "Vos serveurs restent les vôtres : connexions SSH chiffrées et éphémères, secrets isolés par environnement.",
        href: '/securite',
    },
    {
        icon: Sparkles,
        title: 'Tarifs',
        description:
            'Commencez gratuitement, passez à Pro quand votre équipe grandit — sans engagement.',
        href: '/tarifs',
    },
];

export default function WelcomeFr() {
    return (
        <MarketingLayout
            title="App Deployer — Supervision et automatisation de vos déploiements"
            description="App Deployer orchestre vos pipelines de déploiement, vos environnements (Prod, Staging…) et vos équipes depuis une seule plateforme, avec suivi en direct, webhooks Git et connexions SSH chiffrées."
            locale="fr"
            altLocaleHref="/"
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
                                "App Deployer orchestre vos pipelines de déploiement, vos environnements et vos équipes depuis une seule plateforme.",
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
                    <span className="landing-badge">Plateforme hébergée · Vos serveurs, votre contrôle</span>
                    <h1>
                        Déployez vos applications
                        <br />
                        en toute confiance.
                    </h1>
                    <p>
                        App Deployer orchestre vos pipelines de déploiement, vos
                        environnements et vos équipes depuis un seul endroit —
                        avec suivi en direct et rollback simplifié.
                    </p>
                    <div className="landing-hero__actions">
                        <Link href={route('register')}>
                            <Button type="primary" size="large">
                                Créer mon workspace
                                <ArrowRight size={16} />
                            </Button>
                        </Link>
                        <Link href="/fonctionnalites">
                            <Button size="large" type="default">
                                Découvrir les fonctionnalités
                            </Button>
                        </Link>
                    </div>
                    <ul className="landing-hero__chips">
                        <li>Multi-environnements</li>
                        <li>Webhooks Git</li>
                        <li>Rollback rapide</li>
                        <li>Logs en direct</li>
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
                                <span className="mock-tag">succès</span>
                            </div>
                            <div className="mock-row mock-row--succes">
                                <span className="mock-dot" />
                                <span>migrate</span>
                                <span className="mock-tag">succès</span>
                            </div>
                            <div className="mock-row mock-row--running">
                                <span className="mock-dot" />
                                <span>restart-service</span>
                                <span className="mock-tag">en cours</span>
                            </div>
                            <div className="mock-row mock-row--pending">
                                <span className="mock-dot" />
                                <span>smoke-test</span>
                                <span className="mock-tag">en attente</span>
                            </div>
                            <div className="mock-progress">
                                <div className="mock-progress__bar" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <CatalogSection locale="fr" />

            <section className="landing-section">
                <div className="landing-section__header">
                    <h2>Tout ce qu'il faut pour déployer sereinement</h2>
                    <p>
                        De la définition du pipeline jusqu'à l'audit final, App
                        Deployer couvre tout le cycle de vie de vos déploiements.
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
                                En savoir plus <ArrowRight size={14} />
                            </span>
                        </Link>
                    ))}
                </div>
            </section>

            <section className="landing-cta">
                <h2>Prêt à orchestrer vos déploiements ?</h2>
                <p>Créez votre compte et votre workspace en moins de deux minutes.</p>
                <Link href={route('register')}>
                    <Button type="primary" size="large">
                        Commencer gratuitement
                        <ArrowRight size={16} />
                    </Button>
                </Link>
            </section>
        </MarketingLayout>
    );
}
