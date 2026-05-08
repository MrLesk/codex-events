# Development

This file is contributor-facing documentation for working on the `codex-events` repository locally.

## Setup

Install dependencies:

```bash
bun install
```

Copy `.env.example` to `.env` and provide local development values.

Required Auth0 runtime variables:

```bash
NUXT_AUTH0_DOMAIN=your-tenant.auth0.com
NUXT_AUTH0_CLIENT_ID=your-auth0-client-id
NUXT_AUTH0_CLIENT_SECRET=your-auth0-client-secret
NUXT_AUTH0_SESSION_SECRET=$(openssl rand -hex 64)
NUXT_AUTH0_APP_BASE_URL=http://localhost:3000
NUXT_AUTH0_BDD_APP_BASE_URL=http://localhost:3100
NUXT_AUTH0_AUDIENCE=
NUXT_AUTH0_MANAGEMENT_DOMAIN=your-tenant.auth0.com
NUXT_AUTH0_MANAGEMENT_CLIENT_ID=your-management-client-id
NUXT_AUTH0_MANAGEMENT_CLIENT_SECRET=your-management-client-secret
NUXT_AUTH0_MANAGEMENT_AUDIENCE=https://your-tenant.auth0.com/api/v2/
NUXT_AUTH0_DATABASE_CONNECTION_NAME=Username-Password-Authentication
NUXT_AUTH0_GITHUB_CONNECTION_NAME=github
NUXT_AUTH0_ACCOUNT_LINK_CHALLENGE_SECRET=$(openssl rand -hex 32)
NUXT_DATABASE_BINDING=DB
NUXT_PROFILE_ICONS_BINDING=PROFILE_ICONS
NUXT_EVENT_IMAGES_BINDING=EVENT_IMAGES
NUXT_OUTBOUND_EMAIL_BINDING=EMAIL
NUXT_OUTBOUND_EMAIL_FROM_EMAIL=info@your-platform.example
NUXT_OUTBOUND_EMAIL_FROM_NAME=Codex Events
NUXT_OUTBOUND_EMAIL_REPLY_TO=support@your-platform.example
NUXT_APPLICATION_REVIEW_EMAILS_QUEUE_BINDING=APPLICATION_REVIEW_EMAIL_QUEUE
NUXT_APPLICATION_REVIEW_EMAILS_QUEUE_NAME=codex-events-application-review-email-delivery
NUXT_APPLICATION_REVIEW_EMAILS_RETRY_DELAY_SECONDS=120
NUXT_EVENT_OUTCOME_EMAILS_QUEUE_BINDING=EVENT_OUTCOME_EMAIL_QUEUE
NUXT_EVENT_OUTCOME_EMAILS_QUEUE_NAME=codex-events-event-outcome-email-delivery
NUXT_EVENT_OUTCOME_EMAILS_RETRY_DELAY_SECONDS=120
NUXT_LUMA_API_KEY=
NUXT_LUMA_API_BASE_URL=https://public-api.luma.com
NUXT_LUMA_PROFILE_BASE_URL=https://luma.com
NUXT_LUMA_QUEUE_BINDING=APPLICATION_LUMA_SYNC_QUEUE
NUXT_LUMA_QUEUE_NAME=codex-events-application-luma-sync
NUXT_LUMA_RETRY_DELAY_SECONDS=120
NUXT_LUMA_WEBHOOK_SECRET=
```

Local Auth0 dashboard settings:

- Allowed Callback URLs: `http://localhost:3000/auth/callback, http://localhost:3000/auth/link/callback, http://localhost:3000/auth/bdd-callback, http://localhost:3100/auth/callback, http://localhost:3100/auth/link/callback, http://localhost:3100/auth/bdd-callback`
- Allowed Logout URLs: `http://localhost:3000, http://localhost:3100`
- If you enable GitHub social login, create an Auth0 GitHub social connection for the same application and configure the GitHub OAuth app callback URL as `https://<your-auth0-domain>/login/callback`.
- `NUXT_AUTH0_GITHUB_CONNECTION_NAME` must match the Auth0 GitHub connection name when you rename it from the default `github`.

Local Auth0 runtime notes:

- `NUXT_AUTH0_DOMAIN` is the Auth0 issuer host, not the app host. For the shared dev tenant split, use `auth.dev.codex-hackathons.com` or the underlying Auth0 tenant domain, not `dev.codex-hackathons.com`.
- When `NUXT_AUTH0_APP_BASE_URL=http://localhost:3000`, the app intentionally uses a non-secure Auth0 session cookie for local development so Safari can persist the login callback session on `localhost`. HTTPS environments continue to use secure cookies.
- The Auth0-backed BDD suite uses `NUXT_AUTH0_BDD_APP_BASE_URL` when set and otherwise defaults to `http://localhost:3100`, so that `bun run test:bdd` does not have to take over the normal local dev server on port 3000.

Auth0 bootstrap automation:

- `bun tools/auth0/auth0-bootstrap.ts apply`
- `bun tools/auth0/auth0-bootstrap.ts check`

These commands enforce required Auth0 tenant configuration:

- custom domain readiness and default assignment
- Auth0 application display name plus Universal Login branding sync (primary color, page background, wordmark, favicon)
- Universal Login page template sync for canonical login-link styling
- login prompt subtitle copy
- signup prompt consent text/partials cleared so platform consent stays app-owned at `/account/register`
- post-login Action deployment and trigger binding
- required callback/logout/origin URL inclusion on the Auth0 application
- default login URI (`initiate_login_uri`) for password-reset return routing
- tenant default redirection URI fallback (`default_redirection_uri`) for reset-password error states
- required callback inclusion for the explicit account-linking reauthentication flow at `/auth/link/callback`

The checked-in Auth0 bootstrap automation does not currently create or manage the GitHub social connection. Configure that connection in Auth0 separately when you want `/auth/login/github` enabled in a deployment.
If a tenant lacks the paid Universal Login page-template feature, the bootstrap now warns and skips page-template-dependent login prompt customization instead of failing outright. Custom domains, branding, client URLs, and Actions remain required and still fail on drift or API errors.

By default the script reads `NUXT_AUTH0_*` plus `AUTH0_TEST_MGMT_*`. You can override with explicit `AUTH0_*` variables (`AUTH0_DOMAIN`, `AUTH0_MGMT_CLIENT_ID`, `AUTH0_MGMT_CLIENT_SECRET`, `AUTH0_MGMT_AUDIENCE`, `AUTH0_APP_CLIENT_ID`, `AUTH0_APP_DISPLAY_NAME`, `AUTH0_CUSTOM_DOMAIN`, `AUTH0_APP_BASE_URL`, `AUTH0_LOGIN_URI`, `AUTH0_TERMS_URL`, `AUTH0_PRIVACY_URL`, `AUTH0_BRANDING_PRIMARY_COLOR`, `AUTH0_BRANDING_PAGE_BACKGROUND_COLOR`, `AUTH0_BRANDING_LOGO_URL`, `AUTH0_BRANDING_FAVICON_URL`).
`AUTH0_LOGIN_URI` is mandatory whenever `AUTH0_APP_BASE_URL`/`NUXT_AUTH0_APP_BASE_URL` is not HTTPS, and must always be an HTTPS URL.
When `AUTH0_APP_BASE_URL` is HTTPS and explicit branding URLs are omitted, the bootstrap defaults to `${AUTH0_APP_BASE_URL}/auth0/codex-events-wordmark.svg` for the Auth0 wordmark and `${AUTH0_APP_BASE_URL}/favicon.ico` for the favicon.

If you already have legacy Auth0 variables such as `NUXT_PUBLIC_AUTH0_*` or `AUTH0_*`, rename them to the `NUXT_AUTH0_*` keys above.

Luma webhook bootstrap automation:

- `LUMA_WEBHOOK_URL=https://dev.codex-hackathons.com/api/public/luma/webhooks bun tools/luma/webhook-bootstrap.ts check`
- `LUMA_WEBHOOK_URL=https://dev.codex-hackathons.com/api/public/luma/webhooks bun tools/luma/webhook-bootstrap.ts apply --secret-bulk-path .wrangler-luma-webhook-secret.json`

These commands reconcile the repository-managed `guest.updated` webhook for an environment and, in `apply` mode, write a `wrangler secret bulk`-compatible JSON file containing `NUXT_LUMA_WEBHOOK_SECRET`. The script reads `LUMA_API_KEY` or falls back to `NUXT_LUMA_API_KEY`, falls back to `NUXT_LUMA_API_BASE_URL` for the API host, and can derive the webhook URL from an https `NUXT_AUTH0_APP_BASE_URL` when you do not pass `LUMA_WEBHOOK_URL` explicitly.

Local first-platform-admin bootstrap command:

- `bun tools/platform-admin/bootstrap.ts check --email your-admin@example.com`
- `bun tools/platform-admin/bootstrap.ts apply --email your-admin@example.com`

This operator command uses the local Wrangler D1 platform proxy, promotes the target user to platform admin in application data, backfills required event-admin inheritance rows for existing events, and writes an audit-log record when changes are applied.

Local platform legal bootstrap command:

- `bun tools/platform-legal/bootstrap.ts check --config ./legal/platform-legal.json`
- `bun tools/platform-legal/bootstrap.ts apply --config ./legal/platform-legal.json`

This operator command uses the local Wrangler D1 platform proxy to upsert deployment-owned legal settings and create the first `privacy_policy` and `platform_terms` document versions when they do not exist. It does not overwrite existing platform document versions; publish new document versions from `/account/platform-legal` when legal text changes after launch.

Example `platform-legal.json`:

```json
{
  "operatorName": "Your Organization",
  "operatorAddress": "Street Address, City, Country",
  "supportEmail": "support@example.com",
  "privacyEmail": "privacy@example.com",
  "legalContactLanguages": "English",
  "businessPurpose": "Operate event programs and participant workflows.",
  "editorialLine": "Information about events operated on this platform.",
  "imprintContent": "## Imprint\n\nYour legally required imprint content.",
  "documents": {
    "privacy_policy": {
      "title": "Privacy Policy",
      "content": "Your current Privacy Policy content."
    },
    "platform_terms": {
      "title": "Platform Terms",
      "content": "Your current Platform Terms content."
    }
  }
}
```

Shared backend foundation work also expects a D1 binding name at runtime:

- `NUXT_DATABASE_BINDING` should match the D1 binding exposed to the server runtime. The canonical foundation defaults to `DB`.
- local development uses the repository `wrangler.jsonc` plus Wrangler's `getPlatformProxy()` to provide a Cloudflare-native local `DB` binding while the Nuxt server runs under Bun

Profile icon uploads use a Cloudflare R2 binding at runtime:

- `NUXT_PROFILE_ICONS_BINDING` should match the R2 binding used for account profile icons. The canonical default is `PROFILE_ICONS`.
- local development uses the repository `wrangler.jsonc` R2 bucket binding for profile icon object storage.

Event background and banner uploads use a dedicated Cloudflare R2 binding at runtime:

- `NUXT_EVENT_IMAGES_BINDING` should match the R2 binding used for event background and banner image objects. The canonical default is `EVENT_IMAGES`.
- local development uses the repository `wrangler.jsonc` R2 bucket binding for event image object storage.
- `NUXT_EVENT_IMAGES_PUBLIC_CDN_BASE_URL` should be the HTTPS custom-domain base URL for public event gallery images served directly from R2 in deployed environments. The repository config uses `https://cdn.dev.codex-hackathons.com` for `dev` and `https://cdn.codex-hackathons.com` for `production`.
- local `localhost` development can leave `NUXT_EVENT_IMAGES_PUBLIC_CDN_BASE_URL` unset to keep public gallery images on the local Worker routes.

Protected event photo previews use a Cloudflare Images binding at runtime:

- `wrangler.jsonc` binds the Worker `IMAGES` binding for protected gallery preview transformations.
- local development uses the same `IMAGES` binding through Wrangler's local platform proxy.

Outbound email delivery uses Cloudflare Email Service through the Worker `send_email` binding:

- `NUXT_OUTBOUND_EMAIL_BINDING` should match the `send_email` binding name in `wrangler.jsonc`.
- `NUXT_OUTBOUND_EMAIL_FROM_EMAIL` must be a sender address on an Email Service onboarded domain and must be allowed by the binding's `allowed_sender_addresses`.
- `NUXT_OUTBOUND_EMAIL_FROM_NAME` controls the sender display name.
- `NUXT_OUTBOUND_EMAIL_REPLY_TO` controls the reply destination for participant-facing notifications.
- The sending domain must use Cloudflare DNS and be onboarded in Cloudflare Email Service before deployed email delivery works. Email Sending requires a Workers Paid plan.

Application decision emails, event outcome emails, and optional Luma guest-status sync use Cloudflare Queues at runtime:

- `NUXT_APPLICATION_REVIEW_EMAILS_QUEUE_BINDING` and `NUXT_APPLICATION_REVIEW_EMAILS_QUEUE_NAME` should match the producer and consumer queue configuration for participant decision emails.
- `NUXT_EVENT_OUTCOME_EMAILS_QUEUE_BINDING` and `NUXT_EVENT_OUTCOME_EMAILS_QUEUE_NAME` should match the producer and consumer queue configuration for shortlist and winner emails.
- `NUXT_LUMA_QUEUE_BINDING` and `NUXT_LUMA_QUEUE_NAME` should match the producer and consumer queue configuration for Luma sync jobs.
- `NUXT_LUMA_API_KEY` is only required when you operate events that use Luma sync.
- `NUXT_LUMA_WEBHOOK_SECRET` is the runtime signing secret for inbound Luma webhook verification and is uploaded automatically by the checked-in deploy workflows after Luma webhook reconciliation.

## Local Development

Start the development server:

```bash
bun run dev
```

The interface layer uses `shadcn-vue` primitives plus Tailwind CSS.
Generated `shadcn-vue` primitives live under `app/components/ui/`.
Project-owned shared interface components live under `app/components/`.

The built-in Auth0 Nuxt routes are mounted at:

- `/auth/login`
- `/auth/logout`
- `/auth/callback`
- `/auth/backchannel-logout`

The protected example surface added in this repo is `/dashboard`.

## Shared Dev Deployment

The repository `wrangler.jsonc` uses top-level bindings for local development and a separate `dev` environment for the shared Cloudflare deployment at `https://dev.codex-hackathons.com`.

The deployed dev environment uses:

- application URL: `https://dev.codex-hackathons.com`
- Auth0 custom domain: `https://auth.dev.codex-hackathons.com`
- outbound email sender: `info@dev.codex-hackathons.com`

Pushes to `main` publish the shared dev environment automatically through `.github/workflows/ci.yml` after the fast CI checks pass. The shared dev deploy and Auth0-backed BDD jobs use the GitHub Actions `dev` environment.

The GitHub `dev` environment must provide these secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `NUXT_AUTH0_CLIENT_ID`
- `NUXT_AUTH0_CLIENT_SECRET`
- `NUXT_AUTH0_SESSION_SECRET`
- `NUXT_AUTH0_AUDIENCE` when the shared dev Auth0 application uses a non-empty audience
- `NUXT_AUTH0_MANAGEMENT_CLIENT_ID`
- `NUXT_AUTH0_MANAGEMENT_CLIENT_SECRET`
- `NUXT_AUTH0_ACCOUNT_LINK_CHALLENGE_SECRET`
- `NUXT_LUMA_API_KEY` when any shared dev event uses Luma sync
- `AUTH0_TEST_DOMAIN`
- `AUTH0_TEST_MGMT_CLIENT_ID`
- `AUTH0_TEST_MGMT_CLIENT_SECRET`
- `AUTH0_TEST_MGMT_AUDIENCE`
- `AUTH0_TEST_CONNECTION_NAME`
- `E2E_PLATFORM_ADMIN_EMAIL`
- `E2E_PLATFORM_ADMIN_PASSWORD`
- `E2E_EVENT_ADMIN_EMAIL`
- `E2E_EVENT_ADMIN_PASSWORD`
- `E2E_JUDGE_EMAIL`
- `E2E_JUDGE_PASSWORD`
- `E2E_REGULAR_USER_EMAIL`
- `E2E_REGULAR_USER_PASSWORD`

The deploy workflow creates or reuses the Cloudflare Queues declared for the `dev` environment in `wrangler.jsonc`, reconciles the managed shared-dev Luma webhook when `NUXT_LUMA_API_KEY` is present, uploads the shared dev Worker secrets from the GitHub `dev` environment plus the generated `NUXT_LUMA_WEBHOOK_SECRET`, applies the remote dev D1 migrations, and then deploys the Worker. The checked-in dev `wrangler.jsonc` supplies the shared dev Auth0 management domain, management audience, and password connection name as plaintext vars.

The GitHub `dev` environment does not need a stored `NUXT_LUMA_WEBHOOK_SECRET`; the workflow derives it from Luma on each deploy.

The shared dev `CLOUDFLARE_API_TOKEN` must be able to run `wrangler queues create`, `wrangler secret bulk`, `wrangler d1 migrations apply --remote`, and `wrangler deploy`.

For manual recovery or out-of-band releases, export `CLOUDFLARE_MGMT_TOKEN` and run:

```bash
LUMA_WEBHOOK_URL=https://dev.codex-hackathons.com/api/public/luma/webhooks \
bun tools/luma/webhook-bootstrap.ts apply --secret-bulk-path .wrangler-dev-luma-webhook-secret.json
bun run db:migrate:dev
bun run deploy:dev
```

If you use the manual path, upload the generated `.wrangler-dev-luma-webhook-secret.json` contents with `wrangler secret bulk` before `bun run deploy:dev`, or rerun the checked-in workflow to republish the secret automatically.

Pull requests and non-`main` pushes do not publish the shared dev environment. The Auth0-backed BDD workflow also reads its CI secrets from the GitHub `dev` environment.

If Auth0 needs to be re-aligned with the deployed dev hostname split, apply the bootstrap with explicit overrides:

```bash
AUTH0_CUSTOM_DOMAIN=auth.dev.codex-hackathons.com \
AUTH0_APP_BASE_URL=https://dev.codex-hackathons.com \
AUTH0_LOGIN_URI=https://dev.codex-hackathons.com/auth/login \
bun tools/auth0/auth0-bootstrap.ts apply
```

## Production Release Pipeline

Production publishes from GitHub Releases through `.github/workflows/release-production.yml`.

The workflow starts when you manually publish a GitHub Release. The release tag is the canonical version source for that run:

- `v1.2.3` becomes package version `1.2.3`
- the workflow assumes the tagged commit on `main` already passed CI, then migrates and deploys production from that tagged commit
- after a successful release it commits the matching `package.json` version back to `main`

The GitHub `production` environment must provide these secrets before the workflow can run:

- `AUTH0_APP_CLIENT_ID`
- `AUTH0_MGMT_CLIENT_ID`
- `AUTH0_MGMT_CLIENT_SECRET`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `NUXT_AUTH0_AUDIENCE`
- `NUXT_AUTH0_CLIENT_SECRET`
- `NUXT_AUTH0_SESSION_SECRET`
- `NUXT_LUMA_API_KEY`

Least-privilege external credential requirements for the current production workflow:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_MGMT_TOKEN` when you run the same recovery commands locally

These Cloudflare tokens currently need:

- account permission `Workers Scripts Write` for `wrangler secret bulk`, `wrangler queues create`, and `wrangler deploy`
- account permission `D1 Write` for `wrangler d1 migrations apply --remote`
- zone permission `Zone Zone Read` on `codex-hackathons.com` so `tools/auth0/auth0-custom-domain.ts` can resolve the production zone
- zone permission `DNS Write` on `codex-hackathons.com` so `tools/auth0/auth0-custom-domain.ts` can create or update the Auth0 verification CNAME

The Auth0 management machine-to-machine application identified by `AUTH0_MGMT_CLIENT_ID` and `AUTH0_MGMT_CLIENT_SECRET` currently needs these Auth0 Management API scopes:

- `read:clients`
- `update:clients`
- `read:tenant_settings`
- `update:tenant_settings`
- `read:branding`
- `update:branding`
- `delete:branding`
- `read:prompts`
- `update:prompts`
- `read:custom_domains`
- `create:custom_domains`
- `update:custom_domains`
- `read:users`
- `read:actions`
- `create:actions`
- `update:actions`
- `read:triggers`
- `update:triggers`
- `update:users`

The `read:users` and `update:users` scopes are required by the runtime account-linking flow. The app reads linked Auth0 identities to reconcile cross-device sessions and posts to Auth0's user identities endpoint when a verified social login must be connected to an existing password-backed platform account.

`AUTH0_APP_CLIENT_ID` is only an application identifier, not a management credential. Outbound email delivery uses the Cloudflare Email Service `send_email` binding configured in `wrangler.jsonc`; the production sending domain must be onboarded in Cloudflare Email Service before release. The release workflow creates or reuses the Cloudflare Queues declared for the `production` environment in `wrangler.jsonc`, reconciles the managed production Luma webhook when `NUXT_LUMA_API_KEY` is present, uploads Worker secrets plus the generated `NUXT_LUMA_WEBHOOK_SECRET`, applies migrations, and deploys the Worker.

The GitHub `production` environment does not need a stored `NUXT_LUMA_WEBHOOK_SECRET`; the workflow derives it from Luma on each release.

For manual production recovery, reconcile the production webhook first, upload the generated secret with `wrangler secret bulk`, and then deploy:

```bash
LUMA_WEBHOOK_URL=https://codex-hackathons.com/api/public/luma/webhooks \
bun tools/luma/webhook-bootstrap.ts apply --secret-bulk-path .wrangler-production-luma-webhook-secret.json
bun run db:migrate:production
bun run deploy:production
```

The workflow uses these production hostnames:

- application URL: `https://codex-hackathons.com`
- Auth0 custom domain: `https://auth.codex-hackathons.com`

On the first successful production release, the workflow also:

- creates or reuses the Auth0 custom domain
- creates or updates the required Cloudflare DNS-only CNAME verification record
- waits for Auth0 verification and certificate provisioning before applying the rest of the tenant bootstrap

If Auth0 returns `operation_not_supported` with a verified-billing-method message while creating the custom domain, add billing information in the production Auth0 tenant and rerun the release. The release cannot finish the custom-domain setup until Auth0 allows custom-domain creation for that tenant.

## Validation

Run the standard project checks with:

```bash
bun run lint
bun run typecheck
bun run test:all
```

Run individual test layers with:

```bash
bun run test:unit
bun run test:integration
bun run test:bdd
```

GitHub Actions does not run `bun run test:bdd` on every `push` or `pull_request`. The default CI workflow runs the fast gate (`lint`, `typecheck`, `test:unit`, `test:integration`), while the Auth0-backed BDD suite runs only through manual `workflow_dispatch` invocations and the nightly scheduled workflow run.

Run the local full-lifecycle 1000-participant D1 validation with:

```bash
bun tools/load-tests/local-1000-participant-event.ts
```

The runner uses the Auth0-backed BDD origin on `http://localhost:3100`, stores isolated local D1 state under `.wrangler/state-load-1000`, keeps registration and submission open for 10 real minutes each, and writes ignored JSON/Markdown reports under `.wrangler/load-test-reports/`. Use `--smoke` for a shorter 40-participant rehearsal.

For a 10000-participant performance run, use a separate local D1 state root and enable repeated API probes plus Lighthouse:

```bash
bun tools/load-tests/local-1000-participant-event.ts \
  --participant-count 10000 \
  --state-root .wrangler/state-load-10000 \
  --perf-samples 3 \
  --perf-concurrency 2 \
  --lighthouse
```

The performance report includes per-endpoint timing percentiles, response sizes, failure counts, Chrome navigation metrics for the admin operations and public completed event pages, optional Lighthouse scores for the public completed page, and Nuxt dev-server process snapshots. Use `--perf-samples 0` to skip repeated probes and `--no-browser-metrics` to skip Chrome navigation metrics.

Generate the current Drizzle migration from the canonical schema with:

```bash
bun run db:generate
```

Refresh the generated third-party notices asset after runtime dependency changes with:

```bash
bun run notices:generate
```

## End-to-End Tests

The repository uses `Playwright` with `playwright-bdd`, so end-to-end coverage is authored as Gherkin feature files plus step definitions and generated into Playwright tests before execution.

Authenticated end-to-end coverage also requires the Auth0 test-tenant variables from `.env.example`, including:

```bash
AUTH0_TEST_DOMAIN=your-tenant.auth0.com
AUTH0_TEST_MGMT_CLIENT_ID=your-test-management-client-id
AUTH0_TEST_MGMT_CLIENT_SECRET=your-test-management-client-secret
AUTH0_TEST_MGMT_AUDIENCE=https://your-tenant.auth0.com/api/v2/
AUTH0_TEST_CONNECTION_NAME=codex-hackathons-e2e-users
```

For platform fixture reset and authenticated browser coverage, the repository uses the local D1 binding declared in `wrangler.jsonc`. The bootstrap flow clears persisted local D1 data before recreating schema and fixtures through Cloudflare's local D1 runtime.

The repository now treats D1 targets as four distinct environments:

- local app development D1
- local Auth0-backed BDD D1
- remote dev D1
- remote production D1

Install the Playwright browser for local runs:

```bash
bun run test:bdd:install
```

Run the generated end-to-end suite:

```bash
bun run test:bdd
```

This is the canonical local BDD command. It bootstraps the stable Auth0 personas, resets the persisted local Cloudflare D1 state, regenerates the Playwright output, and runs all public, authenticated, and authenticated-destructive BDD scenarios.

BDD source files live under `tests/bdd/`: feature files in `tests/bdd/features`, matching step definitions in `tests/bdd/steps`, and authenticated bootstrap support in `tests/bdd/bootstrap.ts` plus `tests/bdd/support`. Generated files are written under `.features-gen/` and should not be edited by hand.

By default, local app development uses `.wrangler/state` and authenticated BDD uses `.wrangler/state-bdd`. You can override them independently with `LOCAL_DEV_D1_STATE_ROOT` and `LOCAL_BDD_D1_STATE_ROOT`. BDD does not honor a generic `LOCAL_D1_STATE_ROOT` override that points anywhere else, and it fails fast if the BDD root matches the normal local app root.

By default, the Auth0-backed BDD suite runs the local app on `http://localhost:3100`. Override that origin with `NUXT_AUTH0_BDD_APP_BASE_URL` when you need a different dedicated test port. Make sure Auth0 allows callbacks and logouts for whichever BDD origin you choose.

Examples:

```bash
LOCAL_BDD_D1_STATE_ROOT=.wrangler/state-bdd-alt bun run test:bdd
NUXT_AUTH0_BDD_APP_BASE_URL=http://localhost:3200 bun run test:bdd
LOCAL_DEV_D1_STATE_ROOT=.wrangler/state-dev-alt bun run dev
LOCAL_BDD_D1_STATE_ROOT=.wrangler/state-bdd-alt bun tests/bdd/bootstrap.ts
```

The bootstrap flow clears the selected persisted local Cloudflare state, reapplies migrations, reseeds the fixture dataset, clears `tests/bdd/.auth/`, and then performs fresh real Auth0 logins for the stable personas before saving new storage-state artifacts.

The authenticated Playwright setup project writes reusable session-state artifacts under `tests/bdd/.auth/`. Those files are local test artifacts and are gitignored.

The authenticated BDD suite now covers the backend workflow surface delivered by `TASK-3.5` through `TASK-3.9` and the Milestone 1 UI flows delivered by `TASK-4.*`, including actor/session reads, public discovery, admin configuration, application and team formation, submissions, judging, shortlist and winners, prize redemption, audit access, and destructive account deletion.

Keep `.github/workflows/ci.yml`, this document, and `docs/testing-strategy.md` aligned when the required validation surfaces change.
