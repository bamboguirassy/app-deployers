# CLAUDE.md

Guidance for Claude Code (and any AI agent) working in this repository.

## What this is

**App Deploy Supervisor** — a self-hosted deployment orchestration platform. Users create
**Applications** (tenants), each with **Environments** (e.g. Prod/Staging) and **Targets**
(deployable components, e.g. "API", "Frontend", tied to a **Framework**). Each Target has an
ordered **Pipeline** of shell-command steps, and per **TargetEnvironment** pair: environment
variables, a `deploy_path`/`git_branch`, and its own deployment history. Deployments can be
triggered manually or via inbound **Webhooks** (GitHub/GitLab/Bitbucket), run asynchronously
through a queued job, and stream live status over WebSockets (Reverb).

Stack: Laravel 13 (PHP 8.3+) + Inertia v2 + React 18 + TypeScript, Ant Design + Tailwind +
custom SCSS design system, Horizon (queues), Reverb (broadcasting), Sanctum, and
`spatie/laravel-permission` with **teams** (an Application = a team).

## Domain model

- `Application` — root tenant (uuid, slug). Has `Environment`s, `Target`s, `AuditLog`s.
  Membership/roles are *not* a separate members table — they're derived from Spatie's
  `model_has_roles` pivot scoped by `application_id` (the team column).
- `Target` — a deployable unit, belongs to a `Framework`, has ordered `PipelineStep`s,
  `TargetEnvironment`s, `WebhookConfig`s.
- `Environment` — a named stage per Application (slug auto-generated).
- `TargetEnvironment` — pivot of Target+Environment (`deploy_path`, `git_branch`); has
  `EnvironmentVariable`s and `Deployment`s.
- `EnvironmentVariable` — key/value (value is `encrypted` cast) + `is_secret` flag.
- `PipelineStep` — ordered command template (`label`, `command`, `timeout_seconds`,
  `continue_on_failure`).
- `Deployment` — uuid; `status`: `pending|running|succes|echec|annule` (**French** status
  vocabulary is used throughout the domain, on purpose — keep it consistent, don't anglicize
  half the codebase); `trigger_source`: `manual|webhook|scheduled` (scheduled has no
  scheduler wired up yet); has many `DeploymentStep` (snapshotted from `PipelineStep` at
  trigger time).
- `DeploymentStep` — `status`: `pending|running|succes|echec|annule|skipped`, `exit_code`,
  `output`, `pid`, timing.
- `WebhookConfig` — per Target+provider, encrypted secret; has `WebhookBranchMapping`
  (branch → environment).
- `AuditLog` — polymorphic, written via `App\Support\AuditLogger::log()`.
- `Framework` — seeded catalog used for a Target's tech icon/type.
- `User` — Spatie `HasRoles`; `isPlatformAdmin()` means "owner role on at least one
  application" (there is no separate global-admin flag/table).

## Deployment execution flow

1. `App\Services\DeploymentService::trigger()` (called from `DeploymentController@store` or
   `WebhookReceiverController`) takes a per-`TargetEnvironment` cache lock
   (`deploy:lock:{id}`, TTL = `config('deploy.lock_ttl_minutes')`) — throws
   `DeploymentAlreadyRunningException` if already running.
2. Creates a `Deployment` (`pending`) + snapshots current `PipelineStep`s into ordered
   `DeploymentStep`s, dispatches `App\Jobs\RunDeploymentJob` on `config('deploy.queue')`.
3. The job runs steps sequentially via Symfony `Process`, in `deploy_path`, with per-step
   timeout; polls a `deploy:cancel:{id}` cache flag every 250ms to support cooperative
   cancellation (SIGTERM + grace period); truncates stored output; broadcasts
   `DeploymentStatusUpdated` / `DeploymentStepUpdated` on the private channel
   `application.{id}`.
4. On step failure: remaining steps become `skipped` unless `continue_on_failure`. On
   cancel: remaining steps become `annule`. Lock and cancel cache keys are always released
   in a `finally` block.

Cancellation is **cooperative only** — if a worker process dies outright, the lock is not
released until something else clears it. Keep this in mind before "fixing" perceived stuck
deployments by just clearing cache keys blindly.

## Permissions

Spatie permission with teams; `team_foreign_key = application_id`; the active team is set by
`App\Http\Middleware\SetPermissionsTeam` from the `{application}` route binding. Seeded roles
(`database/seeders/RolesAndPermissionsSeeder.php`): `owner`, `manager`, `deployer`, `viewer`,
mapped to permissions (`application.manage`, `pipeline.manage`, `environments.manage`,
`deployments.trigger`, `application.view`) via `App\Policies\ApplicationPolicy`. Any change to
roles/permissions must be reflected in both the seeder and the policy — they are not derived
from a single source.

## Known rough edges (don't be surprised, don't "fix" silently without asking)

- Several controllers hardcode zeroed/fake KPIs on the initial page load (e.g.
  `ApplicationController@show`'s `membersKpis`/`deploymentsKpis`, `UserController@index`) and
  only compute real numbers on the async `search` endpoints. This is intentional-but-unfinished,
  not a bug to "fix" in isolation without checking both code paths.
- `resources/js/constants/deployments.ts` exports `STATUS_COLORS`, but the actual status pills
  in `Dashboard.tsx` / `DeploymentsList.tsx` get their color from SCSS modifier classes
  (`.premium-table__status--*`) that are missing color rules for `pending/running/succes/echec/annule`
  — the "intended" colored design exists in code but isn't wired to CSS.
- `Deployments/Show.tsx` and `Users/Show.tsx` each redeclare local copies of status/role
  label+color maps that already exist in `resources/js/constants/`. Prefer importing the
  shared constant over adding a third copy.
- `ApplicationsList.tsx`'s "Statut" column is hardcoded to always show "Active" — not wired to
  real health data yet.
- `resources/sass/components/_antd-overrides.scss` references a `color-error` token that does
  not exist in `_light.scss`/`_dark.scss` (only `color-danger` is defined) — this silently
  breaks the "Suspendu" status color in `UsersList.tsx`.
- Ant Design theme colors are hardcoded a second time in `resources/js/theme/AppThemeProvider.tsx`'s
  `PALETTE` object, manually kept in sync (per its own comment) with the SCSS `--color-*`
  variables. There is no single source of truth — changing one without the other is a common
  way to introduce a light/dark mismatch.

## Conventions to follow

- **Keep French status/domain vocabulary** (`succes`, `echec`, `annule`, `deploiement.statut`,
  etc.) — this is deliberate, not a translation gap.
- UI kit is **Ant Design** for interactive components (Table, Modal, Tag, Select, Drawer,
  Tooltip, Timeline, Progress...) layered with Tailwind utility classes and a custom SCSS
  design-token system (`resources/sass/abstracts/_variables.scss`,
  `resources/sass/themes/_light.scss` / `_dark.scss`, consumed via the `theme()` SCSS
  function). Reuse existing CSS custom properties (`--color-primary`, `--color-success`,
  `--color-danger`, `--color-warning`, `--color-info`, `--color-surface`, etc.) instead of
  hardcoding hex values.
- Destructive confirmations should go through `theme/ConfirmContext.tsx`'s `useConfirm()`
  (antd `Modal.useModal()` under the hood), which is the pattern used almost everywhere
  (`Applications/Show.tsx`, `EnvironmentWorkspace.tsx`, `MembersPanel.tsx`,
  `PipelineStepsPanel.tsx`, `WebhooksPanel.tsx`, `Users/Show.tsx`). `Profile/Partials/DeleteUserForm.tsx`
  is a known exception (still uses the legacy headlessui `Modal.tsx`) — don't copy that pattern
  for new destructive actions.
- Icon-only buttons must have `aria-label`; prefer pairing with a `Tooltip` for sighted users
  too, matching the existing pattern in `PipelineStepsPanel.tsx`'s Timeout/Continue controls.
- New list/table pages generally follow: hero header → `KpiCollapse` (KPI summary, collapsed
  by default) → `ListToolbar` (search/filter/sort) → antd `Table` with infinite scroll
  (`hooks/useInfiniteScroll.ts`, `hooks/useListSearch.ts`) → row click navigates via Inertia
  `router.visit`. Look at `Components/Applications/ApplicationsList.tsx` or
  `Components/Deployments/DeploymentsList.tsx` before building a new one from scratch.

## Commands

```bash
composer install && npm install
php artisan migrate --seed
npm run dev          # vite dev server (port 5183, see vite.config.js)
php artisan serve    # or your own webserver, APP_URL uses :8010 in .env.example
php artisan horizon   # required for deployments/webhooks to actually run
php artisan reverb:start  # required for live deployment status updates
```

No test suite exists yet for the deployment/application/webhook domain (`tests/` only covers
Breeze's default Auth/Profile scaffolding) — be cautious about claiming behavior is "tested."
