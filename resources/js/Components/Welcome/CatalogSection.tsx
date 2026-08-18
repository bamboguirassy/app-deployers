import { GitBranch, Globe, Lock, Users } from 'lucide-react';

// ── Framework logos (inline SVG, faithful brand colors) ──────────────

const ReactLogo = () => (
    <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ width: 22, height: 22 }}>
        <ellipse cx="50" cy="50" rx="46" ry="17.5" stroke="#61DAFB" strokeWidth="7" fill="none" />
        <ellipse cx="50" cy="50" rx="46" ry="17.5" stroke="#61DAFB" strokeWidth="7" fill="none" transform="rotate(60 50 50)" />
        <ellipse cx="50" cy="50" rx="46" ry="17.5" stroke="#61DAFB" strokeWidth="7" fill="none" transform="rotate(-60 50 50)" />
        <circle cx="50" cy="50" r="7" fill="#61DAFB" />
    </svg>
);

const DjangoLogo = () => (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ width: 28, height: 28 }}>
        <rect width="100" height="100" fill="#092e20" />
        {/* vertical bar */}
        <rect x="19" y="11" width="15" height="78" fill="#44b78b" />
        {/* top serif */}
        <rect x="34" y="11" width="13" height="14" fill="#44b78b" />
        {/* D curve top */}
        <path d="M47 11 Q77 11 77 37 Q77 58 47 58 L47 44 Q63 44 63 37 Q63 25 47 25 Z" fill="#44b78b" />
        {/* lower stem */}
        <rect x="34" y="58" width="13" height="31" fill="#44b78b" />
        {/* D curve bottom (the characteristic descender) */}
        <path d="M47 58 Q68 58 68 73 Q68 89 47 89 L47 76 Q57 76 57 73 Q57 71 47 71 Z" fill="#44b78b" />
    </svg>
);

const LaravelLogo = () => (
    <svg viewBox="0 0 62 62" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ width: 28, height: 28 }}>
        <rect width="62" height="62" rx="8" fill="#FF2D20" />
        {/* Simplified faithful Laravel "L" — white clean letterform */}
        <path d="M14 46 L14 16 L23 16 L23 38 L46 38 L46 46 Z" fill="white" />
    </svg>
);

const GithubIcon = () => (
    <svg width="13" height="13" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
);

const BranchIcon = () => (
    <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 3v12M18 9a3 3 0 100-6 3 3 0 000 6zM6 21a3 3 0 100-6 3 3 0 000 6zM18 9c0 3.314-5.373 6-12 6" />
    </svg>
);

// ── Types ────────────────────────────────────────────────────────────

type EnvStatus = 'ok' | 'run' | 'fail';

interface EnvRow {
    label: string;
    branch: string;
    url: string;
    status: EnvStatus;
    statusLabel: string;
}

interface Target {
    logo: React.ReactNode;
    logoLabel: string;
    fwName: string;
    name: string;
    repo: string;
    envs: EnvRow[];
}

interface FeatureCard {
    icon: React.ReactNode;
    title: string;
    description: string;
}

// ── Content (bilingual) ──────────────────────────────────────────────

const TARGETS: Target[] = [
    {
        logo: <ReactLogo />,
        logoLabel: 'React',
        fwName: 'React',
        name: 'Frontend',
        repo: 'monentreprise/rh-frontend',
        envs: [
            { label: 'Prod',    branch: 'main',    url: 'rh.monentreprise.com',         status: 'ok',  statusLabel: 'Succès · 3h' },
            { label: 'Staging', branch: 'develop', url: 'staging-rh.monentreprise.com', status: 'run', statusLabel: 'En cours' },
        ],
    },
    {
        logo: <DjangoLogo />,
        logoLabel: 'Django',
        fwName: 'Django',
        name: 'Backend',
        repo: 'monentreprise/rh-api',
        envs: [
            { label: 'Prod',    branch: 'main',    url: 'api-rh.monentreprise.com',         status: 'ok', statusLabel: 'Succès · 3h' },
            { label: 'Staging', branch: 'develop', url: 'staging-api.monentreprise.com',    status: 'ok', statusLabel: 'Succès · 5h' },
        ],
    },
    {
        logo: <LaravelLogo />,
        logoLabel: 'Laravel',
        fwName: 'Laravel',
        name: 'SSO',
        repo: 'monentreprise/rh-sso',
        envs: [
            { label: 'Prod', branch: 'main', url: 'sso.monentreprise.com', status: 'ok', statusLabel: 'Succès · 1j' },
        ],
    },
];

const CONTENT = {
    en: {
        badge: 'Beyond deployment',
        heading: 'Every application, catalogued in full',
        sub: 'Not just a pipeline runner — a living registry of your entire stack: components, environments, Git branches, access URLs, teams and history, all in one place.',
        members: '8 members',
        targets: '3 targets · 2 environments',
        features: [
            {
                icon: <Globe size={19} />,
                title: 'Access URLs per environment',
                description: 'Production, staging, QA — each environment exposes its public URL, one click away.',
            },
            {
                icon: <GitBranch size={19} />,
                title: 'Repositories & Git branches',
                description: 'Which branch goes to prod? Which repo for this service? Visible without opening GitHub.',
            },
            {
                icon: <Users size={19} />,
                title: 'Teams & roles',
                description: 'Owner, manager, deployer, viewer — permissions managed per application, not globally.',
            },
            {
                icon: <Lock size={19} />,
                title: 'Encrypted variables',
                description: 'Each environment stores its own variables, encrypted at rest and isolated from other envs.',
            },
        ] as FeatureCard[],
    },
    fr: {
        badge: 'Au-delà du déploiement',
        heading: 'Chaque application, cataloguée dans sa totalité',
        sub: "Pas seulement un lanceur de pipelines — un registre vivant de toute votre stack : composants, environnements, branches git, URLs d'accès, équipes et historique réunis en un seul endroit.",
        members: '8 membres',
        targets: '3 targets · 2 environnements',
        features: [
            {
                icon: <Globe size={19} />,
                title: "URLs d'accès par environnement",
                description: 'Prod, staging, recette — chaque environnement expose son URL publique, accessible en un clic.',
            },
            {
                icon: <GitBranch size={19} />,
                title: 'Dépôts & branches git',
                description: "Quelle branche va en prod ? Quel repo pour ce service ? Lisible sans ouvrir GitHub.",
            },
            {
                icon: <Users size={19} />,
                title: 'Équipes & droits',
                description: "Owner, manager, deployer, viewer — les permissions sont gérées par application, pas globalement.",
            },
            {
                icon: <Lock size={19} />,
                title: 'Variables chiffrées',
                description: "Chaque environnement stocke ses propres variables, chiffrées au repos et isolées des autres envs.",
            },
        ] as FeatureCard[],
    },
};

// ── Component ────────────────────────────────────────────────────────

interface Props {
    locale: 'en' | 'fr';
}

export default function CatalogSection({ locale }: Props) {
    const t = CONTENT[locale];

    return (
        <div className="landing-catalog-wrap">
            <section className="landing-section">

                {/* Header */}
                <div className="landing-section__header">
                    <span className="landing-badge">{t.badge}</span>
                    <h2>{t.heading}</h2>
                    <p>{t.sub}</p>
                </div>

                {/* Catalog card */}
                <div className="catalog-card">

                    {/* Chrome bar */}
                    <div className="catalog-card__chrome" aria-hidden="true">
                        <div className="catalog-card__chrome-dots">
                            <span className="catalog-card__chrome-dot" />
                            <span className="catalog-card__chrome-dot" />
                            <span className="catalog-card__chrome-dot" />
                        </div>
                        <span className="catalog-card__chrome-url">
                            app-deployer.io / <strong>rh-app</strong>
                        </span>
                    </div>

                    {/* App bar */}
                    <div className="catalog-card__app-bar">
                        <div className="catalog-card__app-identity">
                            <div className="catalog-card__app-avatar" aria-hidden="true">RH</div>
                            <div>
                                <div className="catalog-card__app-name">RH App</div>
                                <div className="catalog-card__app-slug">rh-app · monentreprise</div>
                            </div>
                        </div>
                        <div className="catalog-card__app-meta">
                            <span className="catalog-card__meta-item">
                                <Users size={14} />
                                {t.members}
                            </span>
                            <span className="catalog-card__meta-item">
                                <Globe size={14} />
                                {t.targets}
                            </span>
                        </div>
                    </div>

                    {/* Targets */}
                    {TARGETS.map((target) => (
                        <div key={target.name} className="catalog-target">
                            <div className="catalog-target__head">
                                <div className="catalog-target__fw-logo" aria-label={target.logoLabel}>
                                    {target.logo}
                                </div>
                                <span className="catalog-target__fw-name">{target.fwName}</span>
                                <span className="catalog-target__sep" aria-hidden="true">·</span>
                                <span className="catalog-target__name">{target.name}</span>
                                <span className="catalog-target__repo">
                                    <GithubIcon />
                                    {target.repo}
                                </span>
                            </div>

                            <div className="catalog-target__envs">
                                {target.envs.map((env) => (
                                    <div
                                        key={env.label}
                                        className={`catalog-env catalog-env--${env.status}`}
                                    >
                                        <span className="catalog-env__label">{env.label}</span>
                                        <span className="catalog-env__branch">
                                            <BranchIcon />
                                            {env.branch}
                                        </span>
                                        <span className="catalog-env__url">
                                            {env.url}
                                        </span>
                                        <span className={`catalog-env__status catalog-env__status--${env.status}`}>
                                            <span className="catalog-env__status-dot" />
                                            {env.statusLabel}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Feature grid */}
                <div className="landing-teasers landing-catalog-features">
                    {t.features.map((f) => (
                        <div key={f.title} className="landing-feature-card">
                            <div className="landing-feature-card__icon">{f.icon}</div>
                            <h3>{f.title}</h3>
                            <p>{f.description}</p>
                        </div>
                    ))}
                </div>

            </section>
        </div>
    );
}
