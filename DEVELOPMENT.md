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
NUXT_AUTH0_DATABASE_CONNECTION_NAME=Username-Password-Authentication
NUXT_AUTH0_ACCOUNT_LINK_CHALLENGE_SECRET=$(openssl rand -hex 32)
NUXT_DATABASE_BINDING=DB
NUXT_PROFILE_ICONS_BINDING=PROFILE_ICONS
NUXT_EVENT_IMAGES_BINDING=EVENT_IMAGES
NUXT_OUTBOUND_EMAIL_BINDING=EMAIL
NUXT_OUTBOUND_EMAIL_FROM_EMAIL=info@your-platform.example
NUXT_OUTBOUND_EMAIL_FROM_NAME=Codex Events
NUXT_OUTBOUND_EMAIL_REPLY_TO=support@your-platform.example
NUXT_APPLICATION_REVIEW_EMAILS_QUEUE_BINDING=APPLICATION_REVIEW_EMAIL_QUEUE
NUXT_APPLICATION_REVIEW_EMAILS_QUEUE_NAME=codex-events-dev-application-review-email-delivery
NUXT_APPLICATION_REVIEW_EMAILS_RETRY_DELAY_SECONDS=120
NUXT_EVENT_OUTCOME_EMAILS_QUEUE_BINDING=EVENT_OUTCOME_EMAIL_QUEUE
NUXT_EVENT_OUTCOME_EMAILS_QUEUE_NAME=codex-events-dev-event-outcome-email-delivery
NUXT_EVENT_OUTCOME_EMAILS_RETRY_DELAY_SECONDS=120
NUXT_LUMA_API_KEY=
NUXT_LUMA_API_BASE_URL=https://public-api.luma.com
NUXT_LUMA_PROFILE_BASE_URL=https://luma.com
NUXT_LUMA_QUEUE_BINDING=APPLICATION_LUMA_SYNC_QUEUE
NUXT_LUMA_QUEUE_NAME=codex-events-dev-application-luma-sync
NUXT_LUMA_RETRY_DELAY_SECONDS=120
NUXT_LUMA_WEBHOOK_SECRET=
```

Local Auth0 dashboard settings:

- Allowed Callback URLs: `http://localhost:3000/auth/callback, http://localhost:3000/auth/link/callback, http://localhost:3000/auth/bdd-callback, http://localhost:3100/auth/callback, http://localhost:3100/auth/link/callback, http://localhost:3100/auth/bdd-callback`
- Allowed Logout URLs: `http://localhost:3000, http://localhost:3100`
- If you enable GitHub social login, create an Auth0 GitHub social connection for the same application and configure the GitHub OAuth app callback URL as `https://<your-auth0-domain>/login/callback`.

Local Auth0 runtime notes:

- `NUXT_AUTH0_DOMAIN` is the Auth0 issuer host, not the app host. For deployed environments, use the Auth0 custom domain or tenant domain for that deployment, not the application hostname.
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
- post-login Action deployment and trigger binding for consent claims and Auth0 account linking
- required callback/logout/origin URL inclusion on the Auth0 application
- default login URI (`initiate_login_uri`) for password-reset return routing
- tenant default redirection URI fallback (`default_redirection_uri`) for reset-password error states
- required callback inclusion for the account-linking ownership check at `/auth/link/callback`

The checked-in Auth0 bootstrap automation does not currently create or manage the GitHub social connection. Configure that connection in Auth0 separately when you want `/auth/login/github` enabled in a deployment.
If a tenant lacks the paid Universal Login page-template feature, the bootstrap now warns and skips page-template-dependent login prompt customization instead of failing outright. Custom domains, branding, client URLs, and Actions remain required and still fail on drift or API errors.

The script reads explicit tenant automation variables: `AUTH0_MANAGEMENT_DOMAIN`, `AUTH0_MGMT_CLIENT_ID`, `AUTH0_MGMT_CLIENT_SECRET`, `NUXT_AUTH0_CLIENT_ID`, `AUTH0_APP_BASE_URL`, and `AUTH0_ACCOUNT_LINK_CHALLENGE_SECRET` are required. `AUTH0_CUSTOM_DOMAIN` defaults to `auth.<AUTH0_APP_BASE_URL host>` when `AUTH0_APP_BASE_URL` is HTTPS. `AUTH0_DATABASE_CONNECTION_NAME` defaults to `Username-Password-Authentication`.
`AUTH0_LOGIN_URI` is mandatory whenever `AUTH0_APP_BASE_URL` is not HTTPS, and must always be an HTTPS URL.
When `AUTH0_APP_BASE_URL` is HTTPS and explicit branding URLs are omitted, the bootstrap defaults to `${AUTH0_APP_BASE_URL}/auth0/codex-events-wordmark.svg` for the Auth0 wordmark and `${AUTH0_APP_BASE_URL}/favicon.ico` for the favicon.

For app runtime variables, rename legacy `NUXT_PUBLIC_AUTH0_*` keys to the `NUXT_AUTH0_*` keys above. Use `AUTH0_*` only for tenant automation and GitHub environment-level Auth0 settings.

Luma webhook bootstrap automation:

- `NUXT_AUTH0_APP_BASE_URL=https://your-platform.example bun tools/luma/webhook-bootstrap.ts check`
- `NUXT_AUTH0_APP_BASE_URL=https://your-platform.example bun tools/luma/webhook-bootstrap.ts apply --secret-bulk-path .wrangler-luma-webhook-secret.json`

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
  "supportEmail": "support@example.com",
  "imprintContent": "## Operator\n\nYour Organization\nStreet Address, City, Country\n\n## Contact\n\n- Support, legal, and privacy contact: support@example.com\n- Languages accepted for legal and DSA communications: English\n\n## Platform purpose\n\nOperate event programs and participant workflows.\n\n## Editorial focus\n\nInformation about events operated on this platform.\n\n## Legal notice\n\nYour jurisdiction-specific imprint disclosures.",
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

## Remote Deployments

The tracked `wrangler.jsonc` is local/adopter-safe and does not contain remote Cloudflare environments. Remote dev and production deployments generate ignored Wrangler config files from operator-owned environment values:

```bash
bun tools/deploy/generate-wrangler-config.ts dev
bun tools/deploy/generate-wrangler-config.ts production
```

The generated files are written under `.wrangler/generated/` and are used by:

- `bun run db:migrate:dev`
- `bun run db:migrate:production`
- `bun run deploy:dev`
- `bun run deploy:production`

Each environment provides its own `DEPLOY_BASE_DOMAIN`. The generator never derives `dev.*`, `prod.*`, or any other hostname from an environment name.

For the selected target, the generator derives:

- application URL: `https://<base-domain>`
- Cloudflare route pattern: `<base-domain>`
- Luma webhook URL: `https://<base-domain>/api/public/luma/webhooks`
- resource names from `DEPLOY_ENV_NAME` and `DEPLOY_RESOURCE_PREFIX`

`DEPLOY_ENV_NAME` defaults to `dev` for the dev target and `prod` for the production target. `DEPLOY_RESOURCE_PREFIX` defaults to `codex-events`. Default resource names use `<DEPLOY_RESOURCE_PREFIX>-<DEPLOY_ENV_NAME>` for every environment.

Keep `DEPLOY_CF_ZONE_NAME` explicit because the Cloudflare DNS zone cannot be inferred safely from a deployment hostname. `DEPLOY_AUTH0_CUSTOM_DOMAIN` is an optional override and defaults to `auth.<DEPLOY_BASE_DOMAIN>`. The deploy workflow creates or finds the D1 database and R2 buckets by their resolved names, writes the resolved D1 UUID into the job environment, and then generates Wrangler config with that UUID and the resolved bucket names. The `DEPLOY_CF_*` prefix marks deployment metadata for Cloudflare resources. These resource-name variables are optional overrides for generated names:

- `DEPLOY_CF_WORKER_NAME`
- `DEPLOY_CF_D1_DATABASE_NAME`
- `DEPLOY_CF_PROFILE_ICONS_BUCKET`
- `DEPLOY_CF_EVENT_IMAGES_BUCKET`
- `DEPLOY_CF_APPLICATION_REVIEW_EMAIL_QUEUE`
- `DEPLOY_CF_EVENT_OUTCOME_EMAIL_QUEUE`
- `DEPLOY_CF_LUMA_SYNC_QUEUE`

This URL variable is an optional override:

- `DEPLOY_LUMA_WEBHOOK_URL`

Each remote environment must provide:

- `DEPLOY_BASE_DOMAIN`
- `DEPLOY_CF_ZONE_NAME`
- `NUXT_OUTBOUND_EMAIL_FROM_EMAIL`
- `NUXT_OUTBOUND_EMAIL_REPLY_TO`

The existing app runtime variables remain the override interface for Auth0, outbound email, queue binding names, retry delays, and optional Luma access. The generator copies those values into the generated Wrangler `vars` block and fails fast when a required deploy value is missing.

The generated Wrangler config binds Queue producers only. Remote workflows deploy the Worker first, then reconcile Queue consumers by deleting existing consumers from each environment-owned queue through the Cloudflare Queues API and adding the Worker back with the desired batch and retry settings. Cloudflare keeps inactive Worker consumers in the single-consumer slot until they are removed, so consumer attachment is intentionally separate from `wrangler deploy`.

The remote `CLOUDFLARE_API_TOKEN` must be able to run `wrangler d1 list`, `wrangler d1 create`, `wrangler r2 bucket info`, `wrangler r2 bucket create`, `wrangler queues create`, `wrangler secret bulk`, `wrangler d1 migrations apply --remote`, `wrangler deploy`, and `wrangler queues consumer add`. It must also be able to list and delete Queue consumers through the Cloudflare Queues API. Configure the token with the Cloudflare account and zone permissions listed in `OPERATOR.md`; include both read and edit/write access where both are listed.

For manual deployment, export the target environment values and run:

```bash
bun run db:migrate:dev
bun run deploy:dev
```

or:

```bash
bun run db:migrate:production
bun run deploy:production
```

When Luma sync is enabled, the workflow or operator should reconcile the webhook before uploading Worker secrets:

```bash
bun tools/luma/webhook-bootstrap.ts apply --secret-bulk-path .wrangler-luma-webhook-secret.json
```

`LUMA_WEBHOOK_URL` is optional when `NUXT_AUTH0_APP_BASE_URL` is an HTTPS URL; the script derives the webhook URL from that app base URL.

## GitHub Deployments

Pushes to `main` publish the dev environment through `.github/workflows/ci.yml` after the fast CI checks pass. Production publishes from GitHub Releases through `.github/workflows/release-production.yml`.

The GitHub `dev` and `production` environments should store only environment-local deployment metadata as variables and credentials as secrets. Push-based dev deployment is optional for forks and unconfigured environments: if `DEPLOY_BASE_DOMAIN` is empty, the deploy job exits cleanly before reading the rest of the deployment metadata.

Use these environment variable groups:

Required deployment settings:

- `DEPLOY_BASE_DOMAIN`
- `DEPLOY_CF_ZONE_NAME`
- `AUTH0_MANAGEMENT_DOMAIN`
- `NUXT_OUTBOUND_EMAIL_FROM_EMAIL`
- `NUXT_OUTBOUND_EMAIL_REPLY_TO`

Deployment defaults and optional resource-name overrides:

- `DEPLOY_ENV_NAME`
- `DEPLOY_RESOURCE_PREFIX`
- `DEPLOY_CF_WORKER_NAME`
- `DEPLOY_CF_D1_DATABASE_NAME`
- `DEPLOY_CF_PROFILE_ICONS_BUCKET`
- `DEPLOY_CF_EVENT_IMAGES_BUCKET`
- `DEPLOY_CF_APPLICATION_REVIEW_EMAIL_QUEUE`
- `DEPLOY_CF_EVENT_OUTCOME_EMAIL_QUEUE`
- `DEPLOY_CF_LUMA_SYNC_QUEUE`

Auth0 tenant automation settings:

- `AUTH0_APP_DISPLAY_NAME`
- `DEPLOY_AUTH0_CUSTOM_DOMAIN` when the Auth0 login hostname is not `auth.<DEPLOY_BASE_DOMAIN>`

Auth0 runtime settings:

- `NUXT_AUTH0_DATABASE_CONNECTION_NAME` when the Auth0 database connection is not `Username-Password-Authentication`

Cloudflare Email Service and Queues runtime settings:

- `NUXT_OUTBOUND_EMAIL_BINDING`
- `NUXT_OUTBOUND_EMAIL_FROM_EMAIL`
- `NUXT_OUTBOUND_EMAIL_FROM_NAME`
- `NUXT_OUTBOUND_EMAIL_REPLY_TO`
- `NUXT_APPLICATION_REVIEW_EMAILS_QUEUE_BINDING`
- `NUXT_APPLICATION_REVIEW_EMAILS_RETRY_DELAY_SECONDS`
- `NUXT_EVENT_OUTCOME_EMAILS_QUEUE_BINDING`
- `NUXT_EVENT_OUTCOME_EMAILS_RETRY_DELAY_SECONDS`
- `NUXT_LUMA_QUEUE_BINDING`
- `NUXT_LUMA_RETRY_DELAY_SECONDS`

Deployment URL setting:

- `DEPLOY_LUMA_WEBHOOK_URL`

The GitHub `dev` environment must provide these secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `NUXT_AUTH0_CLIENT_ID`
- `NUXT_AUTH0_CLIENT_SECRET`
- `NUXT_AUTH0_SESSION_SECRET`
- `NUXT_AUTH0_AUDIENCE` when the Auth0 application uses a non-empty audience
- `AUTH0_MGMT_CLIENT_ID`
- `AUTH0_MGMT_CLIENT_SECRET`
- `NUXT_AUTH0_ACCOUNT_LINK_CHALLENGE_SECRET`
- `NUXT_LUMA_API_KEY` when any dev event uses Luma sync

The GitHub `bdd` environment must provide these variables:

- `AUTH0_MANAGEMENT_DOMAIN`
- `NUXT_AUTH0_DATABASE_CONNECTION_NAME`

The GitHub `bdd` environment must provide these secrets:

- `NUXT_AUTH0_DOMAIN`
- `NUXT_AUTH0_CLIENT_ID`
- `NUXT_AUTH0_CLIENT_SECRET`
- `NUXT_AUTH0_SESSION_SECRET`
- `NUXT_AUTH0_AUDIENCE` when the Auth0 application uses a non-empty audience
- `AUTH0_MGMT_CLIENT_ID`
- `AUTH0_MGMT_CLIENT_SECRET`
- `E2E_PLATFORM_ADMIN_EMAIL`
- `E2E_PLATFORM_ADMIN_PASSWORD`
- `E2E_EVENT_ADMIN_EMAIL`
- `E2E_EVENT_ADMIN_PASSWORD`
- `E2E_JUDGE_EMAIL`
- `E2E_JUDGE_PASSWORD`
- `E2E_REGULAR_USER_EMAIL`
- `E2E_REGULAR_USER_PASSWORD`

The GitHub `production` environment must provide these secrets before a release can run:

- `NUXT_AUTH0_CLIENT_ID`
- `AUTH0_MGMT_CLIENT_ID`
- `AUTH0_MGMT_CLIENT_SECRET`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `NUXT_AUTH0_AUDIENCE` when the Auth0 application uses a non-empty audience
- `NUXT_AUTH0_CLIENT_SECRET`
- `NUXT_AUTH0_SESSION_SECRET`
- `NUXT_AUTH0_ACCOUNT_LINK_CHALLENGE_SECRET`
- `NUXT_LUMA_API_KEY` when production events use Luma sync

The generated Wrangler config supplies deploy-time Cloudflare bindings and non-secret runtime vars. GitHub workflows upload Worker secrets from the relevant GitHub environment plus the generated `NUXT_LUMA_WEBHOOK_SECRET` when Luma reconciliation runs. GitHub environments do not need a stored `NUXT_LUMA_WEBHOOK_SECRET`.

Cloudflare tokens used by Auth0 custom-domain automation also need the zone permissions listed in `OPERATOR.md` for `DEPLOY_CF_ZONE_NAME`.

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

The `read:users` and `update:users` scopes are required by the Auth0 post-login Action for account linking. The app runtime does not use Auth0 Management API credentials.

`NUXT_AUTH0_CLIENT_ID` is only an application identifier, not a management credential. Outbound email delivery uses the Cloudflare Email Service `send_email` binding configured in the generated Wrangler config; the production sending domain must be onboarded in Cloudflare Email Service before release.

On the first successful production release, the workflow also:

- creates or reuses the Auth0 custom domain
- creates or updates the required Cloudflare DNS-only CNAME verification record
- waits for Auth0 verification and certificate provisioning before applying the rest of the tenant bootstrap

If Auth0 returns `operation_not_supported` with a verified-billing-method message while creating the custom domain, add billing information in the target Auth0 tenant and rerun the deployment workflow. The workflow cannot finish the custom-domain setup until Auth0 allows custom-domain creation for that tenant.

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

Authenticated end-to-end coverage also requires the Auth0 tenant automation variables from `.env.example`, including:

```bash
AUTH0_MANAGEMENT_DOMAIN=your-tenant.auth0.com
AUTH0_MGMT_CLIENT_ID=your-management-client-id
AUTH0_MGMT_CLIENT_SECRET=your-management-client-secret
NUXT_AUTH0_DATABASE_CONNECTION_NAME=codex-events-e2e-users
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
