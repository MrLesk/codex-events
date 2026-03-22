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
```

Local Auth0 dashboard settings:

- Allowed Callback URLs: `http://localhost:3000/auth/callback`
- Allowed Logout URLs: `http://localhost:3000`

If you already have legacy Auth0 variables such as `NUXT_PUBLIC_AUTH0_*` or `AUTH0_*`, rename them to the `NUXT_AUTH0_*` keys above.

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
```

## End-to-End Tests

The repository uses `Playwright` with `playwright-bdd`, so browser scenarios are authored as Gherkin feature files and generated into Playwright tests before execution.

Install the Playwright browser for local runs:

```bash
bun run test:e2e:install
```

Generate Playwright tests from the feature files:

```bash
bun run test:e2e:generate
```

Run the generated end-to-end suite:

```bash
bun run test:e2e
```

Useful variants:

```bash
bun run test:e2e:headed
bun run test:e2e:ui
```

BDD source files live in `tests/bdd/features` and matching step definitions live in `tests/bdd/steps`. Generated files are written to `.features-gen/` and should not be edited by hand.
