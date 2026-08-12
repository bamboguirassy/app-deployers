import LegalLayout from '@/Layouts/LegalLayout';

export default function Refunds() {
    return (
        <LegalLayout title="Politique de remboursement" updatedAt="12 août 2026">
            <p>
                Les abonnements payants à App Deployer sont facturés par notre partenaire{' '}
                <strong>Paddle.com Market Limited</strong>, qui agit en tant que revendeur officiel (Merchant of
                Record) de nos offres. Paddle apparaît sur vos relevés bancaires et gère l'ensemble du processus de
                paiement et de remboursement en notre nom.
            </p>

            <h2>1. Abonnements et renouvellement</h2>
            <p>
                Les abonnements sont facturés à l'avance, mensuellement ou annuellement selon l'offre choisie, et se
                renouvellent automatiquement à la fin de chaque période sauf annulation préalable. Vous pouvez
                annuler votre abonnement à tout moment depuis la page de facturation de votre workspace ; l'abonnement
                reste actif jusqu'à la fin de la période déjà payée.
            </p>

            <h2>2. Période de grâce en cas d'échec de paiement</h2>
            <p>
                En cas d'échec de renouvellement (carte expirée, fonds insuffisants...), une période de grâce de{' '}
                <strong>7 jours</strong> vous est accordée pour mettre à jour votre moyen de paiement, durant
                laquelle les fonctionnalités de votre plan restent actives. À l'issue de ce délai sans régularisation,
                votre workspace est automatiquement repassé au plan gratuit.
            </p>

            <h2>3. Droit de rétractation et remboursement</h2>
            <p>
                Si vous résidez dans l'Union européenne ou dans une juridiction offrant un droit de rétractation
                légal pour les services numériques, vous disposez d'un délai de <strong>14 jours</strong> à compter
                de votre premier paiement pour demander l'annulation et le remboursement intégral de votre
                abonnement, sous réserve de ne pas avoir pleinement utilisé le Service pendant cette période
                conformément aux dispositions applicables.
            </p>
            <p>
                En dehors de ce délai légal, les paiements effectués pour une période d'abonnement déjà entamée ne
                sont pas remboursables au prorata, sauf dans les cas suivants :
            </p>
            <ul>
                <li>
                    une indisponibilité prolongée et avérée du Service, imputable à l'Éditeur, ayant significativement
                    empêché l'utilisation de votre abonnement ;
                </li>
                <li>une erreur de facturation (double prélèvement, montant incorrect) ;</li>
                <li>toute autre situation examinée au cas par cas, à notre discrétion.</li>
            </ul>

            <h2>4. Comment demander un remboursement</h2>
            <p>
                Toute demande de remboursement doit être adressée à Paddle (qui traite directement les demandes liées
                au paiement, en tant que Merchant of Record) via{' '}
                <a href="https://www.paddle.com/help" target="_blank" rel="noreferrer">
                    leur centre d'aide
                </a>
                , ou à nous-mêmes à{' '}
                <a href="mailto:billing@app-deployer.dev">billing@app-deployer.dev</a>, en précisant l'adresse email
                de votre compte et le motif de la demande. Nous traitons chaque demande dans un délai de 5 jours
                ouvrés.
            </p>

            <h2>5. Changement de plan</h2>
            <p>
                Un passage à une offre supérieure prend effet immédiatement, avec un ajustement au prorata de la
                période en cours. Un passage à une offre inférieure prend effet à la fin de la période déjà payée,
                sans remboursement partiel de la période en cours.
            </p>

            <h2>6. Contact</h2>
            <p>
                Pour toute question relative à la facturation ou aux remboursements, contactez-nous à{' '}
                <a href="mailto:billing@app-deployer.dev">billing@app-deployer.dev</a>.
            </p>
        </LegalLayout>
    );
}
