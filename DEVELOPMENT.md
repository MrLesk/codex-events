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
NUXT_DATABASE_BINDING=DB
NUXT_PROFILE_ICONS_BINDING=PROFILE_ICONS
```

Local Auth0 dashboard settings:

- Allowed Callback URLs: `http://localhost:3000/auth/callback`
- Allowed Logout URLs: `http://localhost:3000`

Auth0 consent-bootstrap automation:

- `bun tools/auth0/consent-bootstrap.ts apply`
- `bun tools/auth0/consent-bootstrap.ts check`

These commands enforce the required signup consent configuration for the tenant:

- custom domain readiness and default assignment
- signup prompt policy links and mandatory consent checkbox
- post-login consent Action deployment and trigger binding
- required callback/logout/origin URL inclusion on the Auth0 application
- default login URI (`initiate_login_uri`) for password-reset return routing
- tenant default redirection URI fallback (`default_redirection_uri`) for reset-password error states

By default the script reads `NUXT_AUTH0_*` plus `AUTH0_TEST_MGMT_*`. You can override with explicit `AUTH0_*` variables (`AUTH0_DOMAIN`, `AUTH0_MGMT_CLIENT_ID`, `AUTH0_MGMT_CLIENT_SECRET`, `AUTH0_MGMT_AUDIENCE`, `AUTH0_APP_CLIENT_ID`, `AUTH0_CUSTOM_DOMAIN`, `AUTH0_APP_BASE_URL`, `AUTH0_LOGIN_URI`, `AUTH0_TERMS_URL`, `AUTH0_PRIVACY_URL`).
`AUTH0_LOGIN_URI` is mandatory whenever `AUTH0_APP_BASE_URL`/`NUXT_AUTH0_APP_BASE_URL` is not HTTPS, and must always be an HTTPS URL.

If you already have legacy Auth0 variables such as `NUXT_PUBLIC_AUTH0_*` or `AUTH0_*`, rename them to the `NUXT_AUTH0_*` keys above.

Shared backend foundation work also expects a D1 binding name at runtime:

- `NUXT_DATABASE_BINDING` should match the D1 binding exposed to the server runtime. The canonical foundation defaults to `DB`.
- local development uses the repository `wrangler.jsonc` plus Wrangler's `getPlatformProxy()` to provide a Cloudflare-native local `DB` binding while the Nuxt server runs under Bun

Profile icon uploads use a Cloudflare R2 binding at runtime:

- `NUXT_PROFILE_ICONS_BINDING` should match the R2 binding used for account profile icons. The canonical default is `PROFILE_ICONS`.
- local development uses the repository `wrangler.jsonc` R2 bucket binding for profile icon object storage.

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

For platform fixture reset and authenticated browser coverage, the repository uses the local D1 binding declared in `wrangler.jsonc`. The bootstrap flow clears the persisted `.wrangler/state/v3` data before recreating schema and fixtures through Cloudflare's local D1 runtime.

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

For authenticated runs, the local D1 state under `.wrangler/state/v3` is the default deterministic fixture target. The bootstrap flow clears that persisted local Cloudflare state, reapplies migrations, reseeds the fixture dataset, clears `tests/bdd/.auth/`, and then performs fresh real Auth0 logins for the stable personas before saving new storage-state artifacts.

The authenticated Playwright setup project writes reusable session-state artifacts under `tests/bdd/.auth/`. Those files are local test artifacts and are gitignored.

The authenticated BDD suite now covers the backend workflow surface delivered by `TASK-3.5` through `TASK-3.9` and the Milestone 1 UI flows delivered by `TASK-4.*`, including actor/session reads, public discovery, admin configuration, application and team formation, submissions, judging, shortlist and winners, prize redemption, audit access, and destructive account deletion.

Keep `.github/workflows/ci.yml`, this document, and `docs/testing-strategy.md` aligned when the required validation surfaces change.
