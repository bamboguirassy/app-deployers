export type StepType = 'command' | 'email';

export interface CommandStepConfig {
    command: string;
}

export interface EmailStepConfig {
    to: string[];
    subject: string;
    body: string;
}

export type StepConfigFor<T extends StepType> = T extends 'command' ? CommandStepConfig : EmailStepConfig;

interface PipelineStepBase {
    id: number;
    uuid: string;
    target_id: number;
    label: string;
    order: number;
    timeout_seconds: number | null;
    continue_on_failure: boolean;
}

export type PipelineStep =
    | (PipelineStepBase & { type: 'command'; config: CommandStepConfig })
    | (PipelineStepBase & { type: 'email'; config: EmailStepConfig });

export interface TargetVariable {
    id: number;
    uuid: string;
    target_id: number;
    key: string;
    default_value: string | null;
    is_secret: boolean;
    order: number;
}

export interface EnvironmentVariable {
    id: number;
    uuid: string;
    target_environment_id: number;
    target_variable_id: number;
    value: string | null; // null quand is_secret=true (masqué côté serveur)
}

export interface TargetEnvironmentLink {
    id: number;
    uuid: string;
    target_id: number;
    environment_id: number;
    server_id: number | null;
    deploy_path: string;
    git_branch: string;
    url: string | null;
    environment: Environment;
    variables: EnvironmentVariable[];
    server?: Server | null;
}

export interface WebhookConfig {
    id: number;
    uuid: string;
    target_id: number;
    provider: 'github' | 'gitlab' | 'bitbucket';
    enabled: boolean;
}

export interface Server {
    id: number;
    uuid: string;
    workspace_id: number;
    name: string;
    host: string;
    port: number;
    username: string;
    auth_method: 'password' | 'ssh_key';
    default_path: string;
    created_at: string;
}

export interface Framework {
    id: number;
    name: string;
    slug: string;
    category: string;
    logo_url: string;
}

export interface Target {
    id: number;
    uuid: string;
    application_id: number;
    framework_id: number | null;
    name: string;
    slug: string;
    order: number;
    repository: string | null;
    repository_provider: 'github' | 'gitlab' | 'bitbucket' | null;
    variables: TargetVariable[];
    pipeline_steps: PipelineStep[];
    target_environments: TargetEnvironmentLink[];
    webhook_configs: WebhookConfig[];
    application?: { id: number; name: string; slug: string; logo_url?: string | null };
    framework?: Framework | null;
}

export interface Environment {
    id: number;
    uuid: string;
    application_id: number;
    name: string;
    slug: string;
    order: number;
}

export interface Application {
    id: number;
    uuid: string;
    name: string;
    slug: string;
    description: string | null;
    logo_url: string | null;
    targets: Target[];
    environments: Environment[];
    targets_count?: number;
    environments_count?: number;
    last_deployment_status?: DeploymentStatus | null;
    last_deployment_at?: string | null;
}

export type DeploymentStatus = 'pending' | 'running' | 'succes' | 'echec' | 'annule';
export type DeploymentStepStatus = 'pending' | 'running' | 'succes' | 'echec' | 'annule' | 'skipped';

export interface DeploymentStep {
    id: number;
    deployment_id: number;
    pipeline_step_id: number | null;
    label_snapshot: string;
    type: StepType;
    config_snapshot: CommandStepConfig | EmailStepConfig;
    order: number;
    status: DeploymentStepStatus;
    exit_code: number | null;
    output: string | null;
    started_at: string | null;
    finished_at: string | null;
    duration_ms: number | null;
}

export interface Deployment {
    id: number;
    uuid: string;
    target_environment_id: number;
    status: DeploymentStatus;
    trigger_source: 'manual' | 'webhook' | 'scheduled';
    commit_sha: string | null;
    branch: string | null;
    started_at: string | null;
    finished_at: string | null;
    duration_ms: number | null;
    created_at: string;
    steps: DeploymentStep[];
    target_environment: TargetEnvironmentLink & { target: Target };
    triggered_by: { id: number; uuid: string; name: string } | null;
}
