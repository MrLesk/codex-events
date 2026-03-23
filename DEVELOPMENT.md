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
NUXT_DATABASE_LOCAL_SQLITE_PATH=.data/local-d1.sqlite
```

Local Auth0 dashboard settings:

- Allowed Callback URLs: `http://localhost:3000/auth/callback`
- Allowed Logout URLs: `http://localhost:3000`

If you already have legacy Auth0 variables such as `NUXT_PUBLIC_AUTH0_*` or `AUTH0_*`, rename them to the `NUXT_AUTH0_*` keys above.

Shared backend foundation work also expects a D1 binding name at runtime:

- `NUXT_DATABASE_BINDING` should match the D1 binding exposed to the server runtime. The canonical foundation defaults to `DB`.
- `NUXT_DATABASE_LOCAL_SQLITE_PATH` is an opt-in local fallback for backend integration tests and Auth0-backed Playwright preparation when a Cloudflare D1 binding is not present in `nuxt dev`.

## Local Development

Start the development server:

```bash
bun run dev
```

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
bun run test:unit
bun run test:integration
bun run test:bdd
```

The API-first backend release gate before UI work is:

```bash
bun run validate:backend
```

The Milestone 1 frontend validation scope is:

```bash
bun run test:unit:ui-milestone
bun run test:bdd:ui-milestone
bun run validate:ui-milestone
```

`validate:ui-milestone` is the focused UI command for the canonical public, participant, judge, admin, and prize-recipient surfaces delivered under `TASK-4.*`. It reuses the same Auth0-backed bootstrap and Playwright-BDD flow as the broader suite.

Generate the current Drizzle migration from the canonical schema with:

```bash
bun run db:generate
```

If your Cloudflare D1 credentials are configured in `.env`, push the current schema with:

```bash
bun run db:push
```

Use `bun run db:push` only as a local schema-sync helper against an existing development database. The canonical provisioning path is the checked-in migration chain under `drizzle/*.sql`, which may include manual invariant enforcement that Drizzle cannot express in `schema.ts` alone. Do not treat `db:push` by itself as a complete fresh-provisioning path when manual SQL migrations are present.

## End-to-End Tests

The repository uses `Playwright` with `playwright-bdd`, so end-to-end coverage is authored as Gherkin feature files plus step definitions and generated into Playwright tests before execution.

Authenticated end-to-end coverage also requires the Auth0 test-tenant variables from `.env.example`, including:

```bash
AUTH0_TEST_DOMAIN=your-tenant.auth0.com
AUTH0_TEST_MGMT_CLIENT_ID=your-test-management-client-id
AUTH0_TEST_MGMT_CLIENT_SECRET=your-test-management-client-secret
AUTH0_TEST_MGMT_AUDIENCE=https://your-tenant.auth0.com/api/v2/
AUTH0_TEST_CONNECTION_NAME=Username-Password-Authentication
```

For platform fixture reset, provide either `NUXT_DATABASE_LOCAL_SQLITE_PATH` for local SQLite-backed D1 preparation or the Cloudflare D1 credentials from `.env.example`.

Install the Playwright browser for local runs:

```bash
bun run test:bdd:install
```

Run the generated end-to-end suite:

```bash
bun run test:bdd
```

This is the canonical local BDD command. It bootstraps the stable Auth0 personas, resets the local SQLite-backed fixture database, regenerates the Playwright output, and runs both the signed-out and authenticated BDD scenarios.

Run the focused Milestone 1 UI browser suite with:

```bash
bun run test:bdd:ui-milestone
```

This command keeps the same bootstrap flow but narrows execution to the public homepage and hackathon discovery flows, participant application/team/team-submission flows, judge workspace, admin operations and competition workspaces, prize redemption, and the destructive account-management recovery flow. Dedicated account deletion remains part of the broader `bun run test:bdd` surface instead of the focused UI alias.

BDD source files live under `tests/bdd/`: feature files in `tests/bdd/features`, matching step definitions in `tests/bdd/steps`, and authenticated bootstrap support in `tests/bdd/bootstrap.ts` plus `tests/bdd/support`. Generated files are written under `.features-gen/` and should not be edited by hand.

For authenticated runs, the local SQLite-backed D1 path is the default for deterministic fixture reset. The bootstrap flow deletes and recreates the SQLite database file, reapplies migrations, reseeds the fixture dataset, clears `tests/bdd/.auth/`, and then performs fresh real Auth0 logins for the stable personas before saving new storage-state artifacts.

The authenticated Playwright setup project writes reusable session-state artifacts under `tests/bdd/.auth/`. Those files are local test artifacts and are gitignored.

The authenticated BDD suite now covers the backend workflow surface delivered by `TASK-3.5` through `TASK-3.9`, including actor/session reads, admin configuration, application and team formation, judging, shortlist and winners, prize redemption, audit access, and destructive account deletion.

GitHub Actions uses the same backend release gate. Keep `.github/workflows/ci.yml`, this document, and `docs/testing-strategy.md` aligned when the required validation surface changes.
