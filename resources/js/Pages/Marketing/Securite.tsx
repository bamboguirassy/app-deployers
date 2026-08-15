import MarketingLayout from '@/Layouts/MarketingLayout';
import { Link } from '@inertiajs/react';
import { Button } from 'antd';
import { ArrowRight, ShieldCheck } from 'lucide-react';

export default function Securite() {
    return (
        <MarketingLayout
            title="Sécurité — Connexions SSH chiffrées et audit complet"
            description="Comment App Deployer sécurise vos déploiements : connexions SSH chiffrées et éphémères, variables d'environnement chiffrées, contrôle d'accès par rôle et journal d'audit complet."
            breadcrumbs={[{ label: 'Sécurité' }]}
            locale="fr"
            altLocaleHref="/security"
            headChildren={
                <>
                    <link rel="alternate" hrefLang="en" href="/security" />
                    <link rel="alternate" hrefLang="fr" href="/securite" />
                    <link rel="alternate" hrefLang="x-default" href="/security" />
                </>
            }
        >
            <div className="landing-page-header">
                <h1>Nous hébergeons la plateforme, vous gardez vos serveurs</h1>
                <p>
                    App Deployer orchestre vos déploiements depuis une plateforme que nous administrons ; vos
                    serveurs et vos données applicatives restent chez vous. La connexion SSH est la seule frontière
                    entre les deux, et elle est pensée pour rester fermée par défaut.
                </p>
            </div>

            <section className="landing-section">
                <div className="landing-security">
                    <div className="landing-security__icon">
                        <ShieldCheck size={28} />
                    </div>
                    <div>
                        <ul className="landing-security__list">
                            <li>Identifiants SSH (mot de passe ou clé) chiffrés, jamais stockés en clair.</li>
                            <li>Aucun accès permanent : la connexion n'est établie qu'au moment du déploiement.</li>
                            <li>Accès et actions scopés par workspace, avec historique d'audit complet.</li>
                        </ul>
                    </div>
                </div>
            </section>

            <section className="legal-content" style={{ maxWidth: 720, padding: '0 20px 64px' }}>
                <h2>Connexions SSH chiffrées et éphémères</h2>
                <p>
                    Vos identifiants de connexion (mot de passe ou clé privée) sont chiffrés au repos dans notre
                    base de données. Ils ne sont déchiffrés qu'au moment précis où un déploiement démarre, le temps
                    d'exécuter le pipeline sur votre serveur, puis la connexion est immédiatement refermée. Il n'y a
                    pas de session SSH persistante ouverte en dehors de ces fenêtres d'exécution.
                </p>

                <h2>Variables d'environnement et secrets</h2>
                <p>
                    Chaque environnement (Prod, Staging...) d'une cible de déploiement possède son propre jeu de
                    variables, chiffrées côté plateforme et isolées les unes des autres : un secret configuré pour
                    Staging n'est jamais accessible depuis Prod, et inversement. Les variables marquées comme
                    secrètes sont masquées dans l'interface après leur saisie.
                </p>

                <h2>Contrôle d'accès par rôle</h2>
                <p>
                    L'accès à une application et à ses environnements est régi par des rôles scopés au workspace
                    (owner, manager, deployer, viewer), pas par un accès global au compte. Un membre ne peut
                    déclencher un déploiement, modifier un pipeline ou consulter des variables que si son rôle le
                    permet explicitement.
                </p>

                <h2>Journal d'audit complet</h2>
                <p>
                    Chaque déploiement et chaque changement de configuration (pipeline, variables, membres) est
                    journalisé : qui a fait quoi, quand, et depuis quel déclencheur (manuel ou webhook). Ce journal
                    est consultable à tout moment pour retracer un incident ou répondre à une exigence d'audit
                    interne.
                </p>
            </section>

            <div className="landing-page-cta" style={{ paddingBottom: 64 }}>
                <Link href={route('register')}>
                    <Button type="primary" size="large">
                        Créer mon workspace
                        <ArrowRight size={16} />
                    </Button>
                </Link>
            </div>
        </MarketingLayout>
    );
}
