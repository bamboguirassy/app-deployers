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
    { href: '/features', label: 'Features' },
    { href: '/how-it-works', label: 'How it works' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/security', label: 'Security' },
];

export const FREE_FEATURES = [
    '1 application, to validate your first pipeline',
    '1 deployment at a time',
    'GitHub, GitLab, Bitbucket webhooks',
    'Full deployment history',
    'Live logs',
];

export const PRO_FEATURES = [
    'Unlimited applications',
    'Up to 5 concurrent deployments',
    'Everything included in Free',
    'One-click rollback to any past version',
    'Priority email support',
];

export const FEATURES = [
    {
        icon: LayoutDashboard,
        title: 'Custom pipelines',
        description:
            'Compose an ordered set of shell steps per target, with per-step timeouts and failure handling — no YAML to write.',
        detail:
            "Every deployment target (API, frontend, worker...) gets its own pipeline: an ordered list of shell steps, each with its own timeout and failure behavior (stop the run, or continue anyway). Nothing to hand-maintain in a YAML file — everything is configured from the UI, and each step can be replayed on its own.",
    },
    {
        icon: Lock,
        title: 'Secure SSH connections',
        description:
            "Your server credentials are encrypted and only ever used to open a connection at deploy time — we never have standing access to your machines.",
        detail:
            "Your SSH credentials (password or private key) are encrypted at rest and only decrypted for the brief window it takes to open the connection, right when a deployment runs. No standing access, no session left open outside that window: your servers stay yours, we only execute the commands you defined.",
    },
    {
        icon: KeyRound,
        title: 'Encrypted variables & secrets',
        description:
            'Every environment has its own set of variables, encrypted at the platform level and isolated between Production, Staging and any other environment.',
        detail:
            "Every target/environment pair (e.g. API x Production) has its own set of environment variables, encrypted in the database and never logged in plain text. A variable flagged as a secret is masked in the UI once saved. Nothing can leak from one environment to another: Staging never sees Production's secrets.",
    },
    {
        icon: GitBranch,
        title: 'GitHub, GitLab, Bitbucket webhooks',
        description:
            'Trigger a deployment automatically on push, with a fully configurable branch-to-environment mapping.',
        detail:
            "Connect a GitHub, GitLab or Bitbucket webhook to a target, and decide which branch triggers which environment (for example main -> Production, develop -> Staging). Every webhook delivery is authenticated by signature or token, and automatically deduplicated to avoid double deployments on a provider retry.",
    },
    {
        icon: Radio,
        title: 'Live tracking',
        description:
            'Status, step logs and progress streamed in real time over WebSockets — no more refreshing the page.',
        detail:
            "The moment a deployment starts, its status and every step's output are streamed live over WebSockets (Reverb): you watch the logs appear as they happen, with no page reload, all the way to success, failure, or cancellation. A running deployment can be cancelled mid-flight; remaining steps are then cleanly marked as cancelled.",
    },
    {
        icon: Users,
        title: 'Team roles',
        description:
            'Owner, manager, deployer, viewer: every workspace member gets exactly the access level they need.',
        detail:
            "Four roles cover most organizations: owner (full control, including billing), manager (manages applications and pipelines), deployer (can trigger deployments without changing configuration) and viewer (read-only). Permissions are scoped per application, not global to the whole account.",
    },
    {
        icon: ScrollText,
        title: 'History & audit trail',
        description:
            'Every deployment and every configuration change is logged and available for a full audit.',
        detail:
            "Every deployment keeps its full history: the commit deployed, duration, each step's output, who triggered it and how (manually or via webhook). Configuration changes (pipeline, variables, members) are also recorded in a browsable audit log, useful for tracing an incident or answering a compliance requirement.",
    },
];

export const STEPS = [
    {
        title: 'Create your workspace',
        description:
            'Sign up and name your team. This is the space that groups your applications, servers and members.',
        detail:
            "Signing up creates your account and a first workspace — the space that groups your applications, environments and team members. You can invite colleagues right away and assign them a role (owner, manager, deployer or viewer) matching what they need to do.",
    },
    {
        title: 'Configure your targets',
        description:
            'Add your servers, define your applications, their environments, and the deployment pipeline for each target.',
        detail:
            "Add the servers you deploy to (over SSH), create an application, then its environments (Production, Staging...) and its targets (API, frontend, worker...). For each target, define the pipeline: the ordered list of shell steps to run, with their timeouts and failure behavior. Then add the environment variables specific to each environment.",
    },
    {
        title: 'Deploy and supervise',
        description:
            'Launch a deployment manually or via webhook, and follow every step live until it succeeds.',
        detail:
            "Trigger a first deployment manually from the UI, or set up a Git webhook so every push to the right branch triggers one automatically. Watch progress step by step in real time, all the way to success — or step in immediately (cancel, check the logs) if something goes wrong. Rolling back to a previous version takes one click.",
    },
];
