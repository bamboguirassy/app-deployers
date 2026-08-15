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
    plan?: { slug: string; name: string };
}

export interface User {
    id: number;
    uuid: string;
    name: string;
    email: string;
    email_verified_at?: string | null;
    suspended_at?: string | null;
    is_super_admin?: boolean;
    created_at?: string;
    role?: 'owner' | 'manager' | 'deployer' | 'viewer';
    applications?: ApplicationAccess[];
    workspaces?: Workspace[];
}

export interface Plan {
    id: number;
    slug: string;
    name: string;
    max_applications: number | null;
    max_concurrent_deployments: number | null;
}

export interface AdminPlan extends Plan {
    workspaces_count: number;
    max_applications_in_use: number;
}

export interface Subscription {
    id: number;
    workspace_id: number;
    plan_id: number;
    status: 'active' | 'past_due' | 'canceled';
    is_comped: boolean;
    interval?: 'monthly' | 'yearly' | null;
    renews_at?: string | null;
    grace_period_ends_at?: string | null;
    plan?: Plan;
}

export interface AdminWorkspace {
    id: number;
    uuid: string;
    name: string;
    slug: string;
    suspended_at?: string | null;
    created_at?: string;
    applications_count?: number;
    members_count?: number;
    owner_name?: string | null;
    owner_email?: string | null;
    owner_count?: number;
    subscription?: Subscription | null;
    creator?: { id: number; name: string; email: string } | null;
    latest_application?: { id: number; name: string; logo_url?: string | null } | null;
}

export interface AdminWorkspaceMember {
    id: number;
    name: string;
    email: string;
    role: string | null;
}

export interface AdminFailedDeploymentStep {
    label: string | null;
    exit_code: number | null;
    output_excerpt: string | null;
}

export interface AdminFailedDeployment {
    id: number;
    uuid: string;
    created_at: string;
    target_name: string | null;
    environment_name: string | null;
    failed_step: AdminFailedDeploymentStep | null;
    show_url: string;
}

export interface AdminApplicationStats {
    id: number;
    uuid: string;
    name: string;
    slug: string;
    logo_url: string | null;
    deployments_total: number;
    deployments_failed: number;
    failure_rate: number;
    last_deployment_at: string | null;
    recent_failed_deployments: AdminFailedDeployment[];
}

export interface SubscriptionHistoryEntry {
    id: number;
    status: string;
    interval?: string | null;
    source: 'admin' | 'webhook' | 'system';
    note?: string | null;
    created_at: string;
    plan?: { id: number; name: string } | null;
    changed_by?: { id: number; name: string } | null;
}

export interface ApplicationMember {
    id: number;
    uuid: string;
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

export interface ActiveDeploymentEntry {
    id: number;
    status: 'pending' | 'running';
    started_at: string | null;
    application_name: string;
    target_name: string;
    environment_name: string;
    show_url: string;
    steps_total: number;
    steps_done: number;
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    locale: 'en' | 'fr';
    auth: {
        user: User;
    };
    workspace: Workspace | null;
    workspaces: Workspace[];
    flash: {
        status: string | null;
        error: string | null;
    };
    errors: Record<string, string>;
    activeDeployments: {
        count: number;
        items: ActiveDeploymentEntry[];
    };
};
