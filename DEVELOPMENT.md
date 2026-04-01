# Development

This file is contributor-facing documentation for working on the `codex-hackathons` repository locally.

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
NUXT_HACKATHON_IMAGES_BINDING=HACKATHON_IMAGES
NUXT_APPLICATION_REVIEW_EMAILS_QUEUE_BINDING=APPLICATION_REVIEW_EMAIL_QUEUE
NUXT_APPLICATION_REVIEW_EMAILS_QUEUE_NAME=codex-hackathons-application-review-email-delivery
NUXT_APPLICATION_REVIEW_EMAILS_RETRY_DELAY_SECONDS=120
NUXT_LUMA_API_KEY=
NUXT_LUMA_API_BASE_URL=https://public-api.luma.com
NUXT_LUMA_PROFILE_BASE_URL=https://luma.com
NUXT_LUMA_QUEUE_BINDING=APPLICATION_LUMA_SYNC_QUEUE
NUXT_LUMA_QUEUE_NAME=codex-hackathons-application-luma-sync
NUXT_LUMA_RETRY_DELAY_SECONDS=120
```

Local Auth0 dashboard settings:

- Allowed Callback URLs: `http://localhost:3000/auth/callback, http://localhost:3000/auth/link/callback`
- Allowed Logout URLs: `http://localhost:3000`
- If you enable GitHub social login, create an Auth0 GitHub social connection for the same application and configure the GitHub OAuth app callback URL as `https://<your-auth0-domain>/login/callback`.
- `NUXT_AUTH0_GITHUB_CONNECTION_NAME` must match the Auth0 GitHub connection name when you rename it from the default `github`.

Local Auth0 runtime notes:

- `NUXT_AUTH0_DOMAIN` is the Auth0 issuer host, not the app host. For the shared dev tenant split, use `auth.dev.codex-hackathons.com` or the underlying Auth0 tenant domain, not `dev.codex-hackathons.com`.
- When `NUXT_AUTH0_APP_BASE_URL=http://localhost:3000`, the app intentionally uses a non-secure Auth0 session cookie for local development so Safari can persist the login callback session on `localhost`. HTTPS environments continue to use secure cookies.

Auth0 bootstrap automation:

- `bun tools/auth0/auth0-bootstrap.ts apply`
- `bun tools/auth0/auth0-bootstrap.ts check`

These commands enforce required Auth0 tenant configuration:

- custom domain readiness and default assignment
- Auth0 application display name plus Universal Login branding sync (primary color, page background, logo, favicon)
- Universal Login page template sync for canonical login-link styling
- login prompt subtitle copy
- signup prompt consent text/partials cleared so platform consent stays app-owned at `/account/register`
- post-login Action deployment and trigger binding
- required callback/logout/origin URL inclusion on the Auth0 application
- default login URI (`initiate_login_uri`) for password-reset return routing
- tenant default redirection URI fallback (`default_redirection_uri`) for reset-password error states
- required callback inclusion for the explicit account-linking reauthentication flow at `/auth/link/callback`

The checked-in Auth0 bootstrap automation does not currently create or manage the GitHub social connection. Configure that connection in Auth0 separately when you want `/auth/login/github` enabled in a deployment.

By default the script reads `NUXT_AUTH0_*` plus `AUTH0_TEST_MGMT_*`. You can override with explicit `AUTH0_*` variables (`AUTH0_DOMAIN`, `AUTH0_MGMT_CLIENT_ID`, `AUTH0_MGMT_CLIENT_SECRET`, `AUTH0_MGMT_AUDIENCE`, `AUTH0_APP_CLIENT_ID`, `AUTH0_APP_DISPLAY_NAME`, `AUTH0_CUSTOM_DOMAIN`, `AUTH0_APP_BASE_URL`, `AUTH0_LOGIN_URI`, `AUTH0_TERMS_URL`, `AUTH0_PRIVACY_URL`, `AUTH0_BRANDING_PRIMARY_COLOR`, `AUTH0_BRANDING_PAGE_BACKGROUND_COLOR`, `AUTH0_BRANDING_LOGO_URL`, `AUTH0_BRANDING_FAVICON_URL`).
`AUTH0_LOGIN_URI` is mandatory whenever `AUTH0_APP_BASE_URL`/`NUXT_AUTH0_APP_BASE_URL` is not HTTPS, and must always be an HTTPS URL.
When `AUTH0_APP_BASE_URL` is HTTPS and explicit branding URLs are omitted, the bootstrap defaults to `${AUTH0_APP_BASE_URL}/auth0/codex-hackathons-wordmark.svg` for the logo and `${AUTH0_APP_BASE_URL}/favicon.ico` for the favicon.

If you already have legacy Auth0 variables such as `NUXT_PUBLIC_AUTH0_*` or `AUTH0_*`, rename them to the `NUXT_AUTH0_*` keys above.

Local first-platform-admin bootstrap command:

- `bun tools/platform-admin/bootstrap.ts check --email your-admin@example.com`
- `bun tools/platform-admin/bootstrap.ts apply --email your-admin@example.com`

This operator command uses the local Wrangler D1 platform proxy, promotes the target user to platform admin in application data, backfills required hackathon-admin inheritance rows for existing hackathons, and writes an audit-log record when changes are applied.

Shared backend foundation work also expects a D1 binding name at runtime:

- `NUXT_DATABASE_BINDING` should match the D1 binding exposed to the server runtime. The canonical foundation defaults to `DB`.
- local development uses the repository `wrangler.jsonc` plus Wrangler's `getPlatformProxy()` to provide a Cloudflare-native local `DB` binding while the Nuxt server runs under Bun

Profile icon uploads use a Cloudflare R2 binding at runtime:

- `NUXT_PROFILE_ICONS_BINDING` should match the R2 binding used for account profile icons. The canonical default is `PROFILE_ICONS`.
- local development uses the repository `wrangler.jsonc` R2 bucket binding for profile icon object storage.

Hackathon background and banner uploads use a dedicated Cloudflare R2 binding at runtime:

- `NUXT_HACKATHON_IMAGES_BINDING` should match the R2 binding used for hackathon background and banner image objects. The canonical default is `HACKATHON_IMAGES`.
- local development uses the repository `wrangler.jsonc` R2 bucket binding for hackathon image object storage.

Application decision emails and optional Luma guest-status sync both use Cloudflare Queues at runtime:

- `NUXT_APPLICATION_REVIEW_EMAILS_QUEUE_BINDING` and `NUXT_APPLICATION_REVIEW_EMAILS_QUEUE_NAME` should match the producer and consumer queue configuration for participant decision emails.
- `NUXT_LUMA_QUEUE_BINDING` and `NUXT_LUMA_QUEUE_NAME` should match the producer and consumer queue configuration for Luma sync jobs.
- `NUXT_LUMA_API_KEY` is only required when you operate hackathons that use Luma sync.

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
- `NUXT_RESEND_API_KEY`
- `NUXT_RESEND_FROM_EMAIL`
- `NUXT_RESEND_FROM_NAME`
- `NUXT_RESEND_REPLY_TO`
- `NUXT_LUMA_API_KEY` when any shared dev hackathon uses Luma sync
- `AUTH0_TEST_DOMAIN`
- `AUTH0_TEST_MGMT_CLIENT_ID`
- `AUTH0_TEST_MGMT_CLIENT_SECRET`
- `AUTH0_TEST_MGMT_AUDIENCE`
- `AUTH0_TEST_CONNECTION_NAME`
- `E2E_PLATFORM_ADMIN_EMAIL`
- `E2E_PLATFORM_ADMIN_PASSWORD`
- `E2E_HACKATHON_ADMIN_EMAIL`
- `E2E_HACKATHON_ADMIN_PASSWORD`
- `E2E_JUDGE_EMAIL`
- `E2E_JUDGE_PASSWORD`
- `E2E_REGULAR_USER_EMAIL`
- `E2E_REGULAR_USER_PASSWORD`

The deploy workflow creates or reuses the Cloudflare Queues declared for the `dev` environment in `wrangler.jsonc`, uploads the shared dev Worker secrets from the GitHub `dev` environment, applies the remote dev D1 migrations, and then deploys the Worker. The checked-in dev `wrangler.jsonc` supplies the shared dev Auth0 management domain, management audience, and password connection name as plaintext vars.

The shared dev `CLOUDFLARE_API_TOKEN` must be able to run `wrangler queues create`, `wrangler secret bulk`, `wrangler d1 migrations apply --remote`, and `wrangler deploy`.

For manual recovery or out-of-band releases, export `CLOUDFLARE_MGMT_TOKEN` and run:

```bash
bun run db:migrate:dev
bun run deploy:dev
```

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
- `NUXT_RESEND_API_KEY`
- `NUXT_RESEND_FROM_EMAIL`
- `NUXT_RESEND_REPLY_TO`

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

`AUTH0_APP_CLIENT_ID` is only an application identifier, not a management credential. `NUXT_RESEND_API_KEY` should be a send-capable Resend API key for the sender identity configured by `NUXT_RESEND_FROM_EMAIL`; the checked-in production workflow does not currently require any additional repository-specific Resend scopes. The release workflow creates or reuses the Cloudflare Queues declared for the `production` environment in `wrangler.jsonc` before it uploads Worker secrets, applies migrations, and deploys the Worker.

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

Generate the current Drizzle migration from the canonical schema with:

```bash
bun run db:generate
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

By default, local app development uses `.wrangler/state` and authenticated BDD uses `.wrangler/state-bdd`. You can override them independently with `LOCAL_DEV_D1_STATE_ROOT` and `LOCAL_BDD_D1_STATE_ROOT`, or override the current process directly with `LOCAL_D1_STATE_ROOT`.

Examples:

```bash
LOCAL_BDD_D1_STATE_ROOT=.wrangler/state-bdd-alt bun run test:bdd
LOCAL_DEV_D1_STATE_ROOT=.wrangler/state-dev-alt bun run dev
LOCAL_D1_STATE_ROOT=.wrangler/state-one-off bun tests/bdd/bootstrap.ts
```

The bootstrap flow clears the selected persisted local Cloudflare state, reapplies migrations, reseeds the fixture dataset, clears `tests/bdd/.auth/`, and then performs fresh real Auth0 logins for the stable personas before saving new storage-state artifacts.

The authenticated Playwright setup project writes reusable session-state artifacts under `tests/bdd/.auth/`. Those files are local test artifacts and are gitignored.

The authenticated BDD suite now covers the backend workflow surface delivered by `TASK-3.5` through `TASK-3.9` and the Milestone 1 UI flows delivered by `TASK-4.*`, including actor/session reads, public discovery, admin configuration, application and team formation, submissions, judging, shortlist and winners, prize redemption, audit access, and destructive account deletion.

Keep `.github/workflows/ci.yml`, this document, and `docs/testing-strategy.md` aligned when the required validation surfaces change.
