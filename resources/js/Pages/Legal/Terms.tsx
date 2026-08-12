import LegalLayout from '@/Layouts/LegalLayout';

export default function Terms() {
    return (
        <LegalLayout title="Conditions d'utilisation" updatedAt="12 août 2026">
            <p>
                Les présentes conditions d'utilisation (les « <strong>Conditions</strong> ») régissent l'accès et
                l'utilisation de la plateforme App Deployer (le « <strong>Service</strong> »), éditée par{' '}
                <strong>BAMBOCLOUD</strong>, SARL, immatriculée sous le numéro
                009687362-2R5, dont le siège social est situé à HLM Grand Médine, Villa n°380 (l'«{' '}
                <strong>Éditeur</strong> »). En créant un compte ou en utilisant le Service, vous acceptez d'être lié
                par les présentes Conditions.
            </p>

            <h2>1. Description du service</h2>
            <p>
                App Deployer est une plateforme d'orchestration de déploiements permettant de définir des pipelines
                de commandes, de gérer des environnements, des variables d'environnement chiffrées, des connexions
                SSH vers vos propres serveurs, et de déclencher des déploiements manuellement ou via des webhooks
                (GitHub, GitLab, Bitbucket).
            </p>

            <h2>2. Comptes et accès</h2>
            <p>
                Vous êtes responsable de la confidentialité de vos identifiants de connexion et de toute activité
                réalisée depuis votre compte. Vous devez nous informer sans délai de toute utilisation non autorisée
                de votre compte. L'accès à une « Application » et à ses ressources (serveurs, environnements,
                pipelines) au sein d'un workspace est soumis aux rôles et permissions définis par les administrateurs
                de ce workspace.
            </p>

            <h2>3. Vos serveurs et vos données</h2>
            <p>
                Le Service exécute des commandes que <strong>vous</strong> configurez, sur des serveurs que{' '}
                <strong>vous</strong> possédez ou contrôlez, via des identifiants SSH que vous nous fournissez et qui
                sont stockés chiffrés. Vous êtes seul responsable :
            </p>
            <ul>
                <li>du contenu et de la sécurité des commandes exécutées dans vos pipelines ;</li>
                <li>de la légalité et de la sécurité des applications et données déployées via le Service ;</li>
                <li>de l'exactitude des identifiants de connexion fournis à la plateforme.</li>
            </ul>
            <p>
                L'Éditeur n'accède à vos serveurs qu'au moment de l'exécution d'un déploiement que vous avez
                explicitement déclenché ou configuré (webhook), et n'a aucun accès permanent à vos infrastructures.
            </p>

            <h2>4. Abonnements et facturation</h2>
            <p>
                Certaines fonctionnalités du Service sont proposées via des offres payantes, facturées par
                l'intermédiaire de notre partenaire de paiement <strong>Paddle.com Market Limited</strong>, qui agit
                en tant que revendeur officiel (Merchant of Record) des abonnements App Deployer. Vos informations de
                paiement sont traitées directement par Paddle ; l'Éditeur n'a jamais accès à vos données de carte
                bancaire. Les modalités de facturation, de renouvellement et d'annulation sont détaillées dans notre{' '}
                <a href={route('legal.refunds')}>politique de remboursement</a>.
            </p>
            <p>
                En cas d'échec de paiement, une période de grâce de 7 jours est accordée avant toute suspension des
                fonctionnalités payantes de votre workspace.
            </p>

            <h2>5. Usage acceptable</h2>
            <p>Vous vous engagez à ne pas utiliser le Service pour :</p>
            <ul>
                <li>héberger, déployer ou distribuer du contenu illégal, malveillant ou frauduleux ;</li>
                <li>
                    tenter d'accéder sans autorisation aux systèmes, serveurs ou comptes d'autrui, y compris via le
                    Service ;
                </li>
                <li>surcharger intentionnellement l'infrastructure du Service (déni de service) ;</li>
                <li>contourner les quotas ou limitations techniques de votre offre.</li>
            </ul>
            <p>
                Tout manquement constaté peut entraîner la suspension ou la résiliation de votre compte, sans
                préavis en cas d'urgence (sécurité, illégalité manifeste).
            </p>

            <h2>6. Disponibilité et responsabilité</h2>
            <p>
                Le Service est fourni « en l'état ». L'Éditeur met en œuvre des moyens raisonnables pour assurer sa
                disponibilité et sa fiabilité, mais ne garantit pas une disponibilité continue et ininterrompue.
                Dans la mesure permise par la loi applicable, l'Éditeur ne pourra être tenu responsable des dommages
                indirects résultant de l'utilisation ou de l'impossibilité d'utiliser le Service, notamment en cas
                d'échec d'un déploiement sur vos propres infrastructures.
            </p>

            <h2>7. Résiliation</h2>
            <p>
                Vous pouvez supprimer votre compte à tout moment depuis les paramètres de votre profil. L'Éditeur se
                réserve le droit de suspendre ou résilier un compte en cas de violation des présentes Conditions.
            </p>

            <h2>8. Modification des Conditions</h2>
            <p>
                Les présentes Conditions peuvent être mises à jour. Toute modification substantielle vous sera
                communiquée par email ou notification dans l'application avant son entrée en vigueur.
            </p>

            <h2>9. Droit applicable</h2>
            <p>
                Les présentes Conditions sont régies par le droit sénégalais. Tout litige relève de
                la compétence exclusive des tribunaux de Dakar, au Sénégal, sous réserve des
                dispositions impératives applicables aux consommateurs.
            </p>

            <h2>10. Contact</h2>
            <p>
                Pour toute question relative aux présentes Conditions, contactez-nous à{' '}
                <a href="mailto:contact@app-deployer.dev">contact@app-deployer.dev</a>.
            </p>
        </LegalLayout>
    );
}
