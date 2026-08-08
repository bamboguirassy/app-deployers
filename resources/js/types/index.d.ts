export interface ApplicationAccess {
    user_id: number;
    application_name: string;
    application_slug: string;
}

export interface Workspace {
    id: number;
    name: string;
    slug: string;
    role?: 'owner' | 'manager' | 'deployer' | 'viewer' | null;
}

export interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at?: string | null;
    suspended_at?: string | null;
    created_at?: string;
    role?: 'owner' | 'manager' | 'deployer' | 'viewer';
    applications?: ApplicationAccess[];
}

export interface ApplicationMember {
    id: number;
    name: string;
    email: string;
    role: 'owner' | 'manager' | 'deployer' | 'viewer' | null;
}

export interface ActivityLogEntry {
    id: number;
    action: string;
    subject_type: string;
    subject_id: number;
    changes: Record<string, unknown> | null;
    created_at: string;
    application: { id: number; name: string; slug: string } | null;
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User;
    };
    workspace: Workspace | null;
    workspaces: Workspace[];
};
