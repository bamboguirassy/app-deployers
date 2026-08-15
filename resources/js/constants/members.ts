import { TFunction } from 'i18next';

export const ROLE_VALUES = ['owner', 'manager', 'deployer', 'viewer'] as const;

export const ROLE_COLORS: Record<string, string> = {
    owner: 'purple',
    manager: 'blue',
    deployer: 'green',
    viewer: 'default',
};

/**
 * Les noms de rôle eux-mêmes (Owner/Manager/Deployer/Viewer) restent
 * volontairement identiques en français et en anglais (convention déjà en
 * place dans admin.json) — seule la description qui les accompagne dans un
 * sélecteur est traduite. D'où des fonctions prenant `t` plutôt que des
 * objets constants, à appeler depuis un composant qui a déjà `useTranslation`.
 */
export function getRoleLabel(t: TFunction, role: string): string {
    return t(`common:roles.${role}`, { defaultValue: role });
}

export function getRoleOptions(t: TFunction) {
    return ROLE_VALUES.map((value) => ({ value, label: t(`common:roleDescriptions.${value}`) }));
}

export interface MembersKpis {
    total: number;
    owner: number;
    manager: number;
    deployer: number;
    viewer: number;
}
