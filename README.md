# Codex Hackathons

Codex Hackathons is the platform for running Codex Community hackathons on infrastructure you control. This repository is intended for teams that want to clone the project, configure it for their own Auth0 tenant and Cloudflare account, and operate hackathons from their own deployment.

## What The Platform Covers

The canonical product model in [`docs/`](docs/README.md) is designed to support:

- multiple hackathons running in parallel
- platform accounts that exist independently from any one hackathon
- per-hackathon applications and approval workflows
- team formation, join requests, and team-admin management
- team-owned submissions with controlled submission windows
- blind judging with judge assignment and admin reassignment controls
- shortlist, winner selection, and prize redemption flows
- platform-wide and hackathon-specific terms documents with versioned acceptance records
- hackathon-specific participant profile requirements including X, LinkedIn, GitHub, ChatGPT email, OpenAI org ID, and Luma

For the current domain model, permissions, lifecycle rules, and schema outline, start with:

- [`docs/domain-model.md`](docs/domain-model.md)
- [`docs/lifecycle-and-state-machines.md`](docs/lifecycle-and-state-machines.md)
- [`docs/permissions-matrix.md`](docs/permissions-matrix.md)
- [`docs/schema-outline.md`](docs/schema-outline.md)

## Current Repository Surface

The repository already includes:

- a Nuxt application configured for Auth0-backed sign-in
- a protected dashboard route that exercises authenticated application access
- canonical product and engineering documentation in [`docs/`](docs/README.md)
- a Playwright + `playwright-bdd` test harness for end-to-end scenarios

The product model in `docs/` is broader than the current starter application surface. Treat `docs/` as the source of truth for the platform you are configuring and extending.

## Platform Configuration

To run the platform in your own environment, start from [`.env.example`](.env.example) and provide values for your deployment.

### Auth0 Runtime

These values configure authentication for the Nuxt application:

- `NUXT_AUTH0_DOMAIN`
- `NUXT_AUTH0_CLIENT_ID`
- `NUXT_AUTH0_CLIENT_SECRET`
- `NUXT_AUTH0_SESSION_SECRET`
- `NUXT_AUTH0_APP_BASE_URL`
- `NUXT_AUTH0_AUDIENCE`

For your Auth0 Regular Web Application, configure callback and logout URLs for the domain where you run this app. For example:

- Callback URL: `https://your-domain.example/auth/callback`
- Logout URL: `https://your-domain.example`

Auth0 is responsible for authentication and identity. Platform authorization remains in the application data model, not in Auth0 roles.

### Auth0 Consent Configuration Drift Control

The repository includes an Auth0 tenant automation command that codifies the required signup-consent configuration:

- `bun tools/auth0/consent-bootstrap.ts apply`: idempotently applies required settings
- `bun tools/auth0/consent-bootstrap.ts check`: verifies settings and exits non-zero on drift

The automation covers:

- custom domain presence/readiness and primary/default status
- signup prompt links and required consent checkbox partial
- post-login Action code/deployment for consent claims
- post-login Action binding
- required Auth0 application callback/logout/origin URLs

### Cloudflare Resources

These values identify the Cloudflare account and storage resources used by the platform:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_D1_DATABASE_ID`
- `CLOUDFLARE_R2_BUCKET`

The canonical stack expects Cloudflare Workers for application hosting, D1 for the primary relational database, R2 for file storage, Images for hackathon media, Queues for asynchronous jobs, and Cron Triggers for scheduled platform tasks. See [`docs/tech-stack.md`](docs/tech-stack.md).

## Documentation Map

- [`docs/README.md`](docs/README.md): canonical documentation index
- [`docs/design-reference.md`](docs/design-reference.md): how to use the `Figma-Design/` reference correctly
- [`docs/testing-strategy.md`](docs/testing-strategy.md): canonical testing model, including Auth0-backed E2E rules
- [`DEVELOPMENT.md`](DEVELOPMENT.md): contributor setup, local development, validation, and test commands

## Development

Contributor-facing setup and local workflow live in [`DEVELOPMENT.md`](DEVELOPMENT.md), not in this README.
