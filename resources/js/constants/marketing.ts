import {
    GitBranch,
    KeyRound,
    LayoutDashboard,
    Lock,
    Radio,
    ScrollText,
    Users,
} from 'lucide-react';

export const NAV_LINKS = [
    { href: '/fonctionnalites', label: 'Fonctionnalités' },
    { href: '/comment-ca-marche', label: 'Comment ça marche' },
    { href: '/tarifs', label: 'Tarifs' },
    { href: '/securite', label: 'Sécurité' },
];

export const FREE_FEATURES = [
    '1 application, pour valider votre premier pipeline',
    '1 déploiement à la fois',
    'Webhooks GitHub, GitLab, Bitbucket',
    'Historique de déploiement complet',
    'Logs en direct',
];

export const PRO_FEATURES = [
    'Applications illimitées',
    "Jusqu'à 5 déploiements simultanés",
    'Tout ce qui est inclus dans Free',
    "Rollback en un clic vers n'importe quelle version",
    'Support prioritaire par email',
];

export const FEATURES = [
    {
        icon: LayoutDashboard,
        title: 'Pipelines sur mesure',
        description:
            "Composez une suite d'étapes shell ordonnées par cible, avec timeout et gestion des échecs, sans écrire de YAML.",
        detail:
            "Chaque cible de déploiement (API, Frontend, worker...) a son propre pipeline : une liste ordonnée d'étapes shell, chacune avec son timeout et son comportement en cas d'échec (bloquer la suite, ou continuer malgré tout). Pas de fichier YAML à maintenir à la main : tout se configure depuis l'interface, et chaque étape est rejouable indépendamment.",
    },
    {
        icon: Lock,
        title: 'Connexion SSH sécurisée',
        description:
            "Vos identifiants serveur sont chiffrés et ne servent qu'à établir la connexion au moment du déploiement — nous n'avons jamais accès à vos machines autrement.",
        detail:
            "Vos identifiants SSH (mot de passe ou clé privée) sont chiffrés au repos et ne sont déchiffrés que le temps d'établir la connexion, au moment précis du déploiement. Aucun accès permanent, aucune session ouverte en dehors de ce court instant : vos serveurs restent les vôtres, nous ne faisons qu'y exécuter les commandes que vous avez définies.",
    },
    {
        icon: KeyRound,
        title: 'Variables & secrets chiffrés',
        description:
            'Chaque environnement possède ses propres variables, chiffrées côté plateforme, isolées entre Prod, Staging et vos autres environnements.',
        detail:
            "Chaque paire cible/environnement (ex : API × Production) a son propre jeu de variables d'environnement, chiffrées en base et jamais journalisées en clair. Une variable marquée comme secret est masquée dans l'interface après saisie. Aucune fuite possible d'un environnement vers un autre : Staging ne voit jamais les secrets de Prod.",
    },
    {
        icon: GitBranch,
        title: 'Webhooks GitHub, GitLab, Bitbucket',
        description:
            'Déclenchez un déploiement automatiquement sur un push, avec un mapping branche → environnement entièrement configurable.',
        detail:
            "Connectez un webhook GitHub, GitLab ou Bitbucket à une cible, et définissez quelle branche déclenche quel environnement (par exemple main → Production, develop → Staging). Chaque livraison webhook est authentifiée par signature ou jeton, et dédupliquée automatiquement pour éviter les déploiements en double sur un renvoi du fournisseur.",
    },
    {
        icon: Radio,
        title: 'Suivi en direct',
        description:
            "Statuts, logs d'étapes et progression diffusés en temps réel via WebSockets — plus besoin de rafraîchir la page.",
        detail:
            "Dès qu'un déploiement démarre, son statut et la sortie de chaque étape sont diffusés en direct par WebSockets (Reverb) : vous voyez les logs s'afficher au fur et à mesure, sans recharger la page, jusqu'au succès, à l'échec ou à l'annulation. Un déploiement peut être annulé en cours de route ; les étapes restantes sont alors marquées comme annulées proprement.",
    },
    {
        icon: Users,
        title: 'Rôles par équipe',
        description:
            'Owner, manager, deployer, viewer : chaque membre du workspace a exactement le niveau d\'accès dont il a besoin.',
        detail:
            "Quatre rôles couvrent la plupart des organisations : owner (contrôle total, y compris facturation), manager (gestion des applications et pipelines), deployer (peut déclencher des déploiements sans modifier la configuration) et viewer (lecture seule). Les permissions sont scopées par application, pas globales à tout le compte.",
    },
    {
        icon: ScrollText,
        title: 'Historique & audit',
        description:
            "Chaque déploiement, chaque changement de configuration est journalisé et consultable pour un audit complet.",
        detail:
            "Chaque déploiement conserve son historique complet : commit déployé, durée, sortie de chaque étape, qui l'a déclenché et comment (manuellement ou via webhook). Les changements de configuration (pipeline, variables, membres) sont eux aussi journalisés dans un journal d'audit consultable, utile pour retracer un incident ou répondre à une exigence de conformité.",
    },
];

export const STEPS = [
    {
        title: 'Créez votre workspace',
        description:
            "Inscrivez-vous et donnez un nom à votre équipe. C'est l'espace qui regroupe vos applications, vos serveurs et vos membres.",
        detail:
            "L'inscription crée votre compte et un premier workspace — l'espace qui regroupe vos applications, vos environnements et les membres de votre équipe. Vous pouvez inviter des collègues immédiatement et leur attribuer un rôle (owner, manager, deployer ou viewer) adapté à ce qu'ils doivent pouvoir faire.",
    },
    {
        title: 'Configurez vos cibles',
        description:
            'Ajoutez vos serveurs, définissez vos applications, leurs environnements et le pipeline de déploiement de chaque cible.',
        detail:
            "Ajoutez les serveurs sur lesquels vous déployez (via SSH), créez une application, puis ses environnements (Prod, Staging...) et ses cibles (API, Frontend, worker...). Pour chaque cible, définissez le pipeline : la suite d'étapes shell à exécuter, dans l'ordre, avec leurs éventuels timeouts et leur comportement en cas d'échec. Ajoutez ensuite les variables d'environnement propres à chaque environnement.",
    },
    {
        title: 'Déployez et supervisez',
        description:
            'Lancez un déploiement manuellement ou via webhook, et suivez chaque étape en direct jusqu\'au succès.',
        detail:
            "Déclenchez un premier déploiement manuellement depuis l'interface, ou configurez un webhook Git pour que chaque push sur la bonne branche en déclenche un automatiquement. Suivez la progression étape par étape en temps réel, jusqu'au succès — ou intervenez immédiatement (annulation, consultation des logs) en cas de problème. Un rollback vers une version précédente se fait en un clic.",
    },
];
