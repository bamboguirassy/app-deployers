export const ROLE_OPTIONS = [
    { value: 'owner', label: 'Owner — tous les droits' },
    { value: 'manager', label: 'Manager — pipeline, environnements, déploiements' },
    { value: 'deployer', label: 'Deployer — déclenche des déploiements' },
    { value: 'viewer', label: 'Viewer — lecture seule' },
];

export const ROLE_COLORS: Record<string, string> = {
    owner: 'purple',
    manager: 'blue',
    deployer: 'green',
    viewer: 'default',
};

export interface MembersKpis {
    total: number;
    owner: number;
    manager: number;
    deployer: number;
    viewer: number;
}
