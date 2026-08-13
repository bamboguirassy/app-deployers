import ApplicationLogo from '@/Components/ApplicationLogo';
import ThemeToggle from '@/Components/ThemeToggle';
import { PRO_MONTHLY_PRICE_EUR, PRO_YEARLY_MONTHLY_EQUIVALENT_EUR, PRO_YEARLY_PRICE_EUR, PRO_YEARLY_SAVINGS_EUR } from '@/constants/pricing';
import { Head, Link } from '@inertiajs/react';
import { Button, Drawer, Segmented } from 'antd';
import {
    ArrowRight,
    Check,
    GitBranch,
    KeyRound,
    LayoutDashboard,
    Lock,
    Menu,
    Radio,
    ScrollText,
    ShieldCheck,
    Sparkles,
    Users,
} from 'lucide-react';
import { useState } from 'react';

const NAV_LINKS = [
    { href: '#fonctionnalites', label: 'Fonctionnalités' },
    { href: '#comment-ca-marche', label: 'Comment ça marche' },
    { href: '#tarifs', label: 'Tarifs' },
    { href: '#securite', label: 'Sécurité' },
];

const FREE_FEATURES = [
    '1 application, pour valider votre premier pipeline',
    '1 déploiement à la fois',
    'Webhooks GitHub, GitLab, Bitbucket',
    'Historique de déploiement complet',
    'Logs en direct',
];

const PRO_FEATURES = [
    'Applications illimitées',
    "Jusqu'à 5 déploiements simultanés",
    'Tout ce qui est inclus dans Free',
    "Rollback en un clic vers n'importe quelle version",
    'Support prioritaire par email',
];
const FEATURES = [
    {
        icon: LayoutDashboard,
        title: 'Pipelines sur mesure',
        description:
            "Composez une suite d'étapes shell ordonnées par cible, avec timeout et gestion des échecs, sans écrire de YAML.",
    },
    {
        icon: Lock,
        title: 'Connexion SSH sécurisée',
        description:
            "Vos identifiants serveur sont chiffrés et ne servent qu'à établir la connexion au moment du déploiement — nous n'avons jamais accès à vos machines autrement.",
    },
    {
        icon: KeyRound,
        title: 'Variables & secrets chiffrés',
        description:
            'Chaque environnement possède ses propres variables, chiffrées côté plateforme, isolées entre Prod, Staging et vos autres environnements.',
    },
    {
        icon: GitBranch,
        title: 'Webhooks GitHub, GitLab, Bitbucket',
        description:
            'Déclenchez un déploiement automatiquement sur un push, avec un mapping branche → environnement entièrement configurable.',
    },
    {
        icon: Radio,
        title: 'Suivi en direct',
        description:
            "Statuts, logs d'étapes et progression diffusés en temps réel via WebSockets — plus besoin de rafraîchir la page.",
    },
    {
        icon: Users,
        title: 'Rôles par équipe',
        description:
            'Owner, manager, deployer, viewer : chaque membre du workspace a exactement le niveau d\'accès dont il a besoin.',
    },
    {
        icon: ScrollText,
        title: 'Historique & audit',
        description:
            "Chaque déploiement, chaque changement de configuration est journalisé et consultable pour un audit complet.",
    },
];

const STEPS = [
    {
        title: 'Créez votre workspace',
        description:
            "Inscrivez-vous et donnez un nom à votre équipe. C'est l'espace qui regroupe vos applications, vos serveurs et vos membres.",
    },
    {
        title: 'Configurez vos cibles',
        description:
            'Ajoutez vos serveurs, définissez vos applications, leurs environnements et le pipeline de déploiement de chaque cible.',
    },
    {
        title: 'Déployez et supervisez',
        description:
            'Lancez un déploiement manuellement ou via webhook, et suivez chaque étape en direct jusqu\'au succès.',
    },
];

export default function Welcome() {
    const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly');
    const [mobileNavOpen, setMobileNavOpen] = useState(false);

    return (
        <div className="landing">
            <Head>
                <title>App Deployer — Supervision et automatisation de vos déploiements</title>
                <meta name="robots" content="index, follow" />
                <meta
                    name="description"
                    content="App Deployer orchestre vos pipelines de déploiement, vos environnements (Prod, Staging…) et vos équipes depuis une seule plateforme, avec suivi en direct, webhooks Git et connexions SSH chiffrées."
                />
                <meta
                    property="og:title"
                    content="App Deployer — Supervision et automatisation de vos déploiements"
                />
                <meta
                    property="og:description"
                    content="Orchestrez vos pipelines de déploiement, vos environnements et vos équipes depuis une seule plateforme, avec suivi en direct et rollback simplifié."
                />
                <meta
                    name="twitter:title"
                    content="App Deployer — Supervision et automatisation de vos déploiements"
                />
                <meta
                    name="twitter:description"
                    content="Orchestrez vos pipelines de déploiement, vos environnements et vos équipes depuis une seule plateforme."
                />
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
            </Head>

            <header className="landing-nav">
                <div className="landing-nav__inner">
                    <Link href="/" className="landing-brand">
                        <ApplicationLogo />
                        <span>App Deployer</span>
                    </Link>

                    <nav className="landing-nav__links">
                        {NAV_LINKS.map(({ href, label }) => (
                            <a href={href} key={href}>
                                {label}
                            </a>
                        ))}
                    </nav>

                    <div className="landing-nav__actions">
                        <ThemeToggle />
                        <Link href={route('login')} className="form-link">
                            Se connecter
                        </Link>
                        <Link href={route('register')}>
                            <Button type="primary" size="large">
                                Commencer gratuitement
                            </Button>
                        </Link>
                    </div>

                    <button
                        type="button"
                        className="landing-nav__burger"
                        aria-label="Ouvrir le menu"
                        onClick={() => setMobileNavOpen(true)}
                    >
                        <Menu size={22} />
                    </button>
                </div>
            </header>

            <Drawer
                open={mobileNavOpen}
                onClose={() => setMobileNavOpen(false)}
                placement="right"
                title={
                    <span className="landing-brand">
                        <ApplicationLogo />
                        <span>App Deployer</span>
                    </span>
                }
                className="landing-mobile-drawer"
                width="min(85vw, 320px)"
            >
                <nav className="landing-mobile-nav">
                    {NAV_LINKS.map(({ href, label }) => (
                        <a href={href} key={href} onClick={() => setMobileNavOpen(false)}>
                            {label}
                        </a>
                    ))}
                </nav>

                <div className="landing-mobile-nav__actions">
                    <ThemeToggle />
                    <Link href={route('login')} className="form-link" onClick={() => setMobileNavOpen(false)}>
                        Se connecter
                    </Link>
                    <Link href={route('register')} onClick={() => setMobileNavOpen(false)}>
                        <Button type="primary" size="large" block>
                            Commencer gratuitement
                        </Button>
                    </Link>
                </div>
            </Drawer>

            <main>
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
                            <a href="#fonctionnalites">
                                <Button size="large" type="default">
                                    Découvrir les fonctionnalités
                                </Button>
                            </a>
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

                <section id="fonctionnalites" className="landing-section">
                    <div className="landing-section__header">
                        <h2>Tout ce qu'il faut pour déployer sereinement</h2>
                        <p>
                            De la définition du pipeline jusqu'à l'audit final, App
                            Deployers couvre tout le cycle de vie de vos déploiements.
                        </p>
                    </div>

                    <div className="landing-features">
                        {FEATURES.map(({ icon: Icon, title, description }) => (
                            <div className="landing-feature-card" key={title}>
                                <div className="landing-feature-card__icon">
                                    <Icon size={20} />
                                </div>
                                <h3>{title}</h3>
                                <p>{description}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <section id="comment-ca-marche" className="landing-section landing-section--muted">
                    <div className="landing-section__header">
                        <h2>Opérationnel en trois étapes</h2>
                        <p>Aucune configuration lourde : votre premier déploiement peut avoir lieu aujourd'hui.</p>
                    </div>

                    <div className="landing-steps">
                        {STEPS.map((step, index) => (
                            <div className="landing-step" key={step.title}>
                                <span className="landing-step__number">{index + 1}</span>
                                <h3>{step.title}</h3>
                                <p>{step.description}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <section id="securite" className="landing-section">
                    <div className="landing-security">
                        <div className="landing-security__icon">
                            <ShieldCheck size={28} />
                        </div>
                        <div>
                            <h2>Nous hébergeons la plateforme, vous gardez vos serveurs</h2>
                            <p>
                                App Deployer orchestre vos déploiements depuis une
                                plateforme que nous administrons ; vos serveurs et vos
                                données applicatives restent chez vous. La connexion SSH
                                est la seule frontière entre les deux, et elle est pensée
                                pour rester fermée par défaut.
                            </p>
                            <ul className="landing-security__list">
                                <li>Identifiants SSH (mot de passe ou clé) chiffrés, jamais stockés en clair.</li>
                                <li>Aucun accès permanent : la connexion n'est établie qu'au moment du déploiement.</li>
                                <li>Accès et actions scopés par workspace, avec historique d'audit complet.</li>
                            </ul>
                        </div>
                    </div>
                </section>

                <section id="tarifs" className="landing-section landing-section--muted">
                    <div className="landing-section__header">
                        <h2>Un tarif simple, sans surprise</h2>
                        <p>Commencez gratuitement. Passez à Pro quand votre équipe grandit — annulez à tout moment.</p>
                    </div>

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
            </main>

            <footer className="landing-footer">
                <div className="landing-brand landing-brand--footer">
                    <ApplicationLogo />
                    <span>App Deployer</span>
                </div>
                <p>&copy; {new Date().getFullYear()} App Deployer. Tous droits réservés.</p>
                <p className="legal-footer-links">
                    <Link href={route('legal.terms')}>Conditions d'utilisation</Link>
                    <Link href={route('legal.privacy')}>Politique de confidentialité</Link>
                    <Link href={route('legal.refunds')}>Politique de remboursement</Link>
                </p>
            </footer>
        </div>
    );
}
