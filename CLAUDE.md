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
- **`APP_LOCALE=fr`** (`.env.example`), fallback `en`. All custom-written copy (notifications,
  React pages, flash messages) is hardcoded French inline — there is no i18n framework/translation
  workflow. The only actual translation files are `lang/fr.json` (literal-string overrides for
  Laravel's own built-in notification text — `VerifyEmail`, `ResetPassword`, the markdown mail
  layout's "Whoops!"/"Hello!"/"Regards,") and `lang/fr/auth.php` + `lang/fr/passwords.php`
  (dotted-key overrides for the framework's login/password-reset flash messages). These exist only
  to translate **framework-owned** strings — don't add new keys here for your own copy, just write
  the French text directly like everywhere else in the app. If you add a new built-in Laravel
  auth/notification feature, check whether it surfaces English strings that need a same-pattern
  override.
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

### Email templates

All outgoing mail is built with Laravel's default `Illuminate\Notifications\Messages\MailMessage`
fluent API (`->line()`, `->action()`, `->error()`/`->success()`) — there is **no** custom
`App\Mail` class or bespoke Blade view per notification, and new notifications should follow that
same pattern rather than hand-rolling a view. `MailMessage` has **no** `->table()` method — the
themed table look (`table.blade.php`, `.table` CSS class) only renders from an actual Markdown
pipe-table string. Plain `->line($table)` does **not** work for this: `SimpleMessage::formatLine()`
splits on newlines, trims, and rejoins every line with a single space, which silently flattens a
multi-line table string into unparseable garbage. You must bypass that by wrapping the string in
`new \Illuminate\Support\HtmlString($table)` — `formatLine()` special-cases `Htmlable` and passes
it through untouched (see `DeploymentFailedNotification::toMail()` for the full pattern, including
escaping each cell with `e()` and backslash-escaping literal `|` characters before building the
table, since the `HtmlString` wrapper skips Blade's automatic escaping).
The visual theme lives entirely in the published, customized views under
`resources/views/vendor/mail/` and `resources/views/vendor/notifications/email.blade.php` — do
not re-publish over these or revert them to Laravel's stock defaults.

- **Branding is in the theme, not in each notification.** `resources/views/vendor/mail/html/themes/default.css`
  mirrors the app's SCSS tokens (`--color-primary` → `#4f46e5`, `--color-danger` → `#dc2626`,
  `--color-success` → `#16a34a`, `--color-text` → `#1a1f27`, `--color-text-muted` → `#6b7280`,
  `--color-border` → `#e3e6ea`). If those SCSS tokens change, update this CSS file to match — it
  is a second hand-kept copy, same caveat as the `AppThemeProvider.tsx` `PALETTE` object mentioned
  above.
- **Status color is driven by `MailMessage::level()`**, not by anything a notification's view has
  to set manually: `->error()` → red accent bar + red button, `->success()` → green, default/`->line()`-only
  → indigo. This flows through `resources/views/vendor/notifications/email.blade.php` (passes
  `:level="$level"` into `<x-mail::message>`) → `message.blade.php` → `header.blade.php` (renders
  the 3px accent bar). Don't add a separate "status" parameter to a notification — call `->error()`
  / `->success()` and the theme handles the rest.
- **The header renders the real logo** (`public/logos/logo.svg`) next to a text wordmark
  (`header.blade.php`) — the wordmark is there so the mail still reads correctly in clients that
  block remote images by default (Outlook, some Gmail configurations). Don't replace the wordmark
  with an image-only header.
- **The footer's contact line** (`footer.blade.php`) reads `config('mail.support_address')`
  (`MAIL_SUPPORT_ADDRESS` env var, falls back to `MAIL_FROM_ADDRESS`) — a human contact, kept
  deliberately separate from the technical "from" address. Don't hardcode an email address in a
  Blade view.
- **Technical, tabular facts** (branch, commit, exit code, target/environment pair, etc.) should
  be built as a Markdown pipe-table string and passed to `->line()` (see above) rather than folded
  into prose — they need to be scannable, not read as a sentence. `DeploymentFailedNotification`
  follows this pattern; reuse it for any *new* notification that carries more than one technical
  fact.
- Adding a new notification type only requires a `toMail()` method built from these primitives —
  no new view, no new CSS. If a notification ever needs something the `MailMessage` API can't
  express (e.g. an embedded chart), that's a signal to discuss a dedicated Blade/Markdown view
  before building one, not to bolt raw HTML into a `->line()`.

### Per-page SEO meta overrides (`app.blade.php`)

The `inertia` attribute on a blade default tag (`<title inertia>`, `<meta name="description" inertia>`,
etc.) only makes Inertia replace it **client-side, after hydration** (DOM diffing on `<Head>`
mount/navigation) — it does **nothing** on the very first server response, SSR included, which is
exactly what crawlers and the SSR renderer see. Relying on the `inertia` attribute alone silently
produced **duplicate** `<title>`/`<meta name="robots">`/`<meta name="description">`/OG/Twitter tags
on every page that tried to override one via its own `<Head>` (Welcome, the legal pages) — the
blade default was never actually removed, just appended after. This is a easy trap to fall back
into if you add a new per-page meta override without checking the current pattern.

The fix in place: `app.blade.php` computes `$ownsFullSeoMeta` / `$ownsTitleOnly` from
`Route::currentRouteName()` and wraps the affected blade defaults (title, robots, description,
og:title/description, twitter:title/description — **not** canonical/og:url/og:image/twitter:image/
twitter:card, which no page currently overrides) in `@unless` blocks, so exactly one of
{blade default, page's own tag} ever renders. **If you give a new page its own `<title>`/robots/
description/OG override, add its route name to the relevant array in `app.blade.php` — don't just
add the override in the page and assume the blade default gets replaced.**

### Inertia SSR (SEO)

Server-side rendering is wired up (Inertia v2 + `@inertiajs/react/server`) so crawlers (Google,
GPTBot, ClaudeBot, etc.) get fully-rendered HTML instead of an empty `<div id="app">` on the
public/SEO-relevant pages — currently `Welcome`, `Legal/Terms`, `Legal/Privacy`, `Legal/Refunds`,
`Auth/Login`, `Auth/Register`.

- Entry point: `resources/js/ssr.tsx` (separate from the client entry `resources/js/app.tsx`) —
  built via `vite build --ssr` into `bootstrap/ssr/ssr.js` (see `ssr` option in `vite.config.js`).
  `npm run build` runs both the client and SSR builds.
- SSR is **not scoped per-route** — `inertiajs/inertia-laravel`'s `HttpGateway` attempts SSR for
  *every* Inertia response when `INERTIA_SSR_ENABLED=true`, but silently falls back to normal
  client-side rendering if the SSR server is down, the bundle is missing, or the Node render
  throws for that specific page. This is what makes it safe to leave enabled globally rather than
  auditing every authenticated/dashboard page (many of which use `useEcho` /
  `@laravel/echo-react` for live deployment status and aren't SSR-safe) — a broken page just loses
  the SSR benefit for that one request, it doesn't 500 or take down the SSR worker.
- **`route()` gotcha**: client-side, `window.route` is injected by the `@routes` Blade directive
  (inline script), which never runs during SSR. `ssr.tsx` reconstructs it manually via the
  `ziggy-js` npm package + a generated `resources/js/ziggy.js` (gitignored, regenerated by
  `php artisan ziggy:generate`, wired into the `npm run build` script) and sets it as `global.route`
  before rendering each page. Any *new* SEO-relevant page that calls `route(...)` at render time
  will crash the SSR render (falls back to CSR, per above) unless this stays in place.
- Requires `php artisan inertia:start-ssr` running (Node process) — add it alongside
  Horizon/Reverb/schedule:work in whatever process supervisor runs those in production (see
  `app-deployer-supervisor.ini`'s `[program:inertia-ssr]` block). The command has no `--port`
  option: the server's actual listen port comes from `INERTIA_SSR_PORT`, read from
  `process.env` in `resources/js/ssr.tsx` (default `13714`). **This app's `.env` is *not* where
  that variable lives in production** — Supervisor starts the Node process with its own
  `environment=` line, which never reads the project's `.env` file, so `INERTIA_SSR_PORT` is set
  directly in `app-deployer-supervisor.ini` (currently `13711`). `INERTIA_SSR_URL` is a separate
  concern entirely: it's read by PHP (Apache/PHP-FPM — a different process from the one Supervisor
  manages here) to know where to send render requests, so it **does** belong in `.env`, and must
  be kept manually in sync with whatever port Supervisor actually binds to — there's no mechanism
  enforcing that, so double-check both if either one changes. Locally (running
  `php artisan inertia:start-ssr` by hand, outside Supervisor), `INERTIA_SSR_PORT` can be exported
  in your shell or set in your local `.env` — that only matters when nothing else is providing it.
- If you add a new page and want it SSR'd for SEO, just give it real crawlable content/meta (see
  the meta-tag conventions above) — no per-page opt-in needed, it'll be attempted automatically.
  Conversely, don't rely on SSR output for anything user-specific/authenticated: those pages are
  free to stay CSR-only (fallback) and shouldn't set `robots: index, follow` anyway (see the global
  `noindex, nofollow` default in `resources/views/app.blade.php`).

## Commands

```bash
composer install && npm install
php artisan migrate --seed
npm run dev          # vite dev server (port 5183, see vite.config.js)
php artisan serve    # or your own webserver, APP_URL uses :8010 in .env.example
php artisan horizon   # required for deployments/webhooks to actually run
php artisan reverb:start  # required for live deployment status updates
php artisan schedule:work  # required for deploy:reconcile-stuck / billing:expire-grace-periods
php artisan inertia:start-ssr  # required for SEO-relevant pages to be server-rendered (see SSR section below)
```

`tests/Feature/DeploymentServiceTest.php` and `tests/Feature/ReconcileStuckDeploymentsTest.php`
cover the deployment domain's locking/reconciliation behavior (run with `php artisan test`,
sqlite in-memory). Most other deployment/application/webhook code paths are still untested —
be cautious about claiming behavior beyond these two files is "tested."
