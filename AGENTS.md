# AGENTS.md

Guidance for Codex (and any AI agent) working in this repository.

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
5. Command steps broadcast incremental output live (`DeploymentStepOutputAppended`,
   `.deploiement.sortie`) while running, throttled to at most one broadcast per 400ms/4KB
   (`RunDeploymentJob::throttledOutputBroadcaster()`) — the final full output still only
   arrives via `DeploymentStepUpdated` at step completion; a small tail of output between the
   last throttled flush and completion is only visible there, never lost from the DB record.
6. Any transition to `echec` (normal failure, unhandled exception, queue-wait timeout via
   `failed()`, or `deploy:reconcile-stuck`) triggers `App\Listeners\NotifyOnDeploymentFailure`
   (listens on `DeploymentStatusUpdated`, registered in `AppServiceProvider::boot()`) — emails
   workspace owners + the triggering user via `DeploymentFailedNotification`.

Cancellation is **cooperative only** — if a worker process dies outright mid-run, the
`finally` block in `RunDeploymentJob` never executes, so the lock, the concurrency slot, and
the deployment's `running` status would stay stuck forever. `App\Console\Commands\ReconcileStuckDeployments`
(`deploy:reconcile-stuck`, scheduled every 5 minutes in `routes/console.php`) is the safety
net: any deployment still `running` after `config('deploy.stuck_running_after_minutes')`
(default 60) is force-marked `echec`, its remaining steps `annule`, and its lock/slot
released. `pending` deployments are deliberately left alone — that state is already bounded
by `RunDeploymentJob::retryUntil()`/`failed()` (queue-wait timeout). Don't "fix" stuck
deployments by clearing cache keys by hand — extend this command instead.

## Permissions

Spatie permission with teams; `team_foreign_key = application_id`; the active team is set by
`App\Http\Middleware\SetPermissionsTeam` from the `{application}` route binding. Seeded roles
(`database/seeders/RolesAndPermissionsSeeder.php`): `owner`, `manager`, `deployer`, `viewer`,
mapped to permissions (`application.manage`, `pipeline.manage`, `environments.manage`,
`deployments.trigger`, `application.view`) via `App\Policies\ApplicationPolicy`. Any change to
roles/permissions must be reflected in both the seeder and the policy — they are not derived
from a single source.

## Known rough edges (don't be surprised, don't "fix" silently without asking)

*Last verified 2026-08-11 — several items previously listed here (hardcoded KPIs,
unwired `STATUS_COLORS`, duplicated status/role label maps, hardcoded "Active" status,
missing `color-error` token) have since been fixed and were removed from this list. If
you rediscover one of those, it's a regression, not a known gap — worth flagging.*

- Ant Design theme colors are hardcoded a second time in `resources/js/theme/AppThemeProvider.tsx`'s
  `PALETTE` object (currently just `colorPrimary`/`colorBgBase`/`colorTextBase` per mode),
  manually kept in sync (per its own comment) with the SCSS `--color-*` variables. There is no
  single source of truth — changing one without the other is a way to introduce a light/dark
  mismatch. Small enough now that it hasn't been worth wiring to a single source, but don't grow
  it without addressing that.
- `trigger_source: scheduled` exists on `Deployment` and is handled by `DeploymentContextBuilder`,
  but nothing actually schedules a deployment yet (no cron/UI wired up) — the value is
  future-proofing, not a working feature.
- Webhook receiver dedupe (`WebhookReceiverController::handle()`) keys on the provider's
  delivery-id header when available (`X-GitHub-Delivery`, `X-Gitlab-Event-UUID`,
  `X-Request-UUID` for Bitbucket) with a 24h TTL — falls back to `branch:commit_sha` when the
  provider sends none (Bitbucket without a proxy adding that header). This also fixed a latent
  bug: the method's return type was `Illuminate\Http\Response`, which doesn't cover
  `response()->json(...)` (`JsonResponse`) — every non-error branch (success, dedupe-ignored,
  no-mapping) threw a `TypeError` (500) in production. Now typed as
  `Symfony\Component\HttpFoundation\Response`.
- No rollback of the *target server's filesystem/service state* on a failed deployment — only
  `DeploymentController::rollback()` (redeploy the branch/commit of a past `succes` deployment,
  same mechanism as `retry()`) exists. If a pipeline step partially mutates the server before
  failing, nothing undoes that automatically; a rollback just runs the pipeline again against
  the old ref.

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
php artisan schedule:work  # required for deploy:reconcile-stuck / billing:expire-grace-periods
```

`tests/Feature/DeploymentServiceTest.php` and `tests/Feature/ReconcileStuckDeploymentsTest.php`
cover the deployment domain's locking/reconciliation behavior (run with `php artisan test`,
sqlite in-memory). Most other deployment/application/webhook code paths are still untested —
be cautious about claiming behavior beyond these two files is "tested."
