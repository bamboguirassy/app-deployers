import LegalLayout from '@/Layouts/LegalLayout';

export default function Privacy() {
    return (
        <LegalLayout title="Politique de confidentialité" updatedAt="12 août 2026">
            <p>
                Cette politique décrit comment <strong>BAMBOCLOUD</strong> (« nous »), éditeur de
                la plateforme App Deployer, collecte, utilise et protège vos données personnelles lorsque vous
                utilisez le Service.
            </p>

            <h2>1. Données que nous collectons</h2>
            <ul>
                <li>
                    <strong>Données de compte</strong> : nom, adresse email, mot de passe (haché, jamais stocké en
                    clair).
                </li>
                <li>
                    <strong>Données de facturation</strong> : gérées directement par notre partenaire de paiement
                    Paddle.com Market Limited — nous ne stockons jamais vos coordonnées bancaires.
                </li>
                <li>
                    <strong>Données de configuration</strong> : noms d'applications, d'environnements, de cibles de
                    déploiement, variables d'environnement (chiffrées au repos), identifiants de connexion SSH
                    (chiffrés au repos), configuration de webhooks.
                </li>
                <li>
                    <strong>Journaux d'activité</strong> : historique des déploiements, sorties de commandes
                    exécutées (susceptibles de contenir des informations que vous choisissez d'afficher dans vos
                    scripts — évitez d'y faire apparaître des secrets en clair), journal d'audit des actions
                    effectuées sur votre workspace.
                </li>
                <li>
                    <strong>Données techniques</strong> : adresse IP, type de navigateur, journaux serveur, à des
                    fins de sécurité et de diagnostic.
                </li>
            </ul>

            <h2>2. Pourquoi nous les utilisons</h2>
            <ul>
                <li>Fournir, exploiter et maintenir le Service (exécution des déploiements que vous configurez) ;</li>
                <li>Gérer votre compte, votre abonnement et la facturation via Paddle ;</li>
                <li>Vous notifier d'événements liés à vos déploiements (échec, statut) ;</li>
                <li>Assurer la sécurité de la plateforme et prévenir les abus (limitation de débit, dédoublonnage des webhooks) ;</li>
                <li>Répondre à nos obligations légales et réglementaires.</li>
            </ul>

            <h2>3. Base légale du traitement</h2>
            <p>
                Le traitement de vos données repose sur l'exécution du contrat qui nous lie (fourniture du Service),
                notre intérêt légitime (sécurité, prévention de la fraude), et, le cas échéant, votre consentement
                (communications marketing optionnelles).
            </p>

            <h2>4. Partage de vos données</h2>
            <p>Nous ne vendons jamais vos données personnelles. Elles peuvent être partagées avec :</p>
            <ul>
                <li>
                    <strong>Paddle.com Market Limited</strong>, notre revendeur officiel, pour le traitement des
                    paiements et abonnements ;
                </li>
                <li>
                    nos hébergeurs et fournisseurs d'infrastructure, pour l'exploitation technique du Service ;
                </li>
                <li>les autorités compétentes, si la loi nous y oblige.</li>
            </ul>
            <p>
                Vos identifiants SSH et variables d'environnement chiffrées ne sont jamais partagés avec un tiers et
                ne sont déchiffrés que le temps strictement nécessaire à l'exécution d'un déploiement que vous avez
                déclenché.
            </p>

            <h2>5. Durée de conservation</h2>
            <p>
                Vos données de compte sont conservées tant que votre compte est actif. En cas de suppression de
                compte, vos données personnelles sont supprimées ou anonymisées dans un délai raisonnable, sous
                réserve des obligations légales de conservation (notamment comptables).
            </p>

            <h2>6. Vos droits</h2>
            <p>
                Selon votre juridiction (notamment si le Règlement Général sur la Protection des Données — RGPD —
                s'applique à vous), vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation
                du traitement, de portabilité et d'opposition concernant vos données personnelles. Vous pouvez
                exercer ces droits en nous contactant à{' '}
                <a href="mailto:privacy@app-deployer.dev">privacy@app-deployer.dev</a>.
            </p>

            <h2>7. Sécurité</h2>
            <p>
                Les mots de passe sont hachés, les identifiants de connexion serveur et les variables d'environnement
                sont chiffrés au repos. L'accès aux ressources d'un workspace est scopé par rôle. Malgré ces mesures,
                aucun système n'est infaillible à 100 % ; en cas d'incident de sécurité affectant vos données, nous
                vous en informerons conformément à la réglementation applicable.
            </p>

            <h2>8. Cookies</h2>
            <p>
                Nous utilisons des cookies strictement nécessaires au fonctionnement du Service (session
                d'authentification, protection contre la falsification de requêtes). Nous n'utilisons pas de cookies
                publicitaires tiers.
            </p>

            <h2>9. Modifications de cette politique</h2>
            <p>
                Cette politique peut être mise à jour périodiquement. La date de dernière mise à jour figure en haut
                de cette page.
            </p>

            <h2>10. Contact</h2>
            <p>
                Pour toute question relative à cette politique ou à vos données personnelles, contactez-nous à{' '}
                <a href="mailto:privacy@app-deployer.dev">privacy@app-deployer.dev</a>.
            </p>
        </LegalLayout>
    );
}
