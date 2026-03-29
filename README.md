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
- user-managed profile icons uploaded from account settings

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
- `NUXT_AUTH0_MANAGEMENT_DOMAIN`
- `NUXT_AUTH0_MANAGEMENT_CLIENT_ID`
- `NUXT_AUTH0_MANAGEMENT_CLIENT_SECRET`
- `NUXT_AUTH0_MANAGEMENT_AUDIENCE`
- `NUXT_AUTH0_DATABASE_CONNECTION_NAME`
- `NUXT_AUTH0_ACCOUNT_LINK_CHALLENGE_SECRET`
- `NUXT_PROFILE_ICONS_BINDING`
- `NUXT_HACKATHON_IMAGES_BINDING`

For your Auth0 Regular Web Application, configure callback and logout URLs for the domain where you run this app. For example:

- Callback URL: `https://your-domain.example/auth/callback`
- Callback URL: `https://your-domain.example/auth/link/callback`
- Logout URL: `https://your-domain.example`

If you also use an Auth0 custom domain, keep it separate from the application hostname. The deployed dev environment in this repository uses:

- application URL: `https://dev.codex-hackathons.com`
- Auth0 custom domain: `https://auth.dev.codex-hackathons.com`

Auth0 is responsible for authentication and identity. Platform authorization remains in the application data model, not in Auth0 roles.

### Outbound Email Runtime (Resend)

These values configure participant-facing application decision emails sent after hackathon application approval or rejection:

- `NUXT_RESEND_API_KEY`
- `NUXT_RESEND_FROM_EMAIL`
- `NUXT_RESEND_FROM_NAME`
- `NUXT_RESEND_REPLY_TO`
- `NUXT_APPLICATION_REVIEW_EMAILS_QUEUE_BINDING`
- `NUXT_APPLICATION_REVIEW_EMAILS_QUEUE_NAME`
- `NUXT_APPLICATION_REVIEW_EMAILS_RETRY_DELAY_SECONDS`

Set `NUXT_RESEND_API_KEY` as a secret in deployed environments (for example, a Cloudflare Workers secret) and keep sender identity values in your environment configuration.

Application review APIs enqueue email delivery work to a Cloudflare Queue. Ensure your Worker has both producer and consumer queue configuration for the queue identified by `NUXT_APPLICATION_REVIEW_EMAILS_QUEUE_NAME` and bound through `NUXT_APPLICATION_REVIEW_EMAILS_QUEUE_BINDING`.

### Auth0 Bootstrap Configuration Drift Control

The repository includes an Auth0 tenant automation command that codifies required Auth0 tenant configuration:

- `bun tools/auth0/auth0-bootstrap.ts apply`: idempotently applies required settings
- `bun tools/auth0/auth0-bootstrap.ts check`: verifies settings and exits non-zero on drift

The automation covers:

- custom domain presence/readiness and primary/default status
- Auth0 application display name plus Universal Login branding sync (primary color, page background, logo, favicon)
- Universal Login page template sync for canonical login-link styling
- login prompt subtitle copy
- signup prompt consent text/partials cleared so platform consent stays app-owned in the application
- post-login Action deployment
- post-login Action binding
- required Auth0 application callback/logout/origin URLs
- required callback inclusion for the explicit account-linking reauthentication flow
- Auth0 application default login URI (`initiate_login_uri`) for password-reset return navigation
- Auth0 tenant default redirection URI (`default_redirection_uri`) as fallback return navigation

By default the branding sync uses the canonical Codex Hackathons wordmark asset served from `/auth0/codex-hackathons-wordmark.svg` on your `AUTH0_APP_BASE_URL`. Override `AUTH0_APP_DISPLAY_NAME`, `AUTH0_BRANDING_LOGO_URL`, or the color variables if your deployment needs different branding.

### Platform Admin Bootstrap

Platform-admin authorization is stored in platform data (`users.is_platform_admin`) rather than Auth0 roles.

For first-admin bootstrap in your environment, use:

- `bun tools/platform-admin/bootstrap.ts check --email your-admin@example.com`
- `bun tools/platform-admin/bootstrap.ts apply --email your-admin@example.com`

The command is idempotent. It promotes the target user to platform admin, ensures required hackathon-admin inheritance role rows for existing hackathons, and records an audit-log entry when changes are applied.

### Cloudflare Resources

These values identify the Cloudflare account and storage resources used by the platform:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_D1_DATABASE_ID`
- `CLOUDFLARE_R2_BUCKET`

The canonical stack expects Cloudflare Workers for application hosting, D1 for the primary relational database, R2 for file storage (including profile icons and hackathon images), Queues for asynchronous jobs, and Cron Triggers for scheduled platform tasks. See [`docs/tech-stack.md`](docs/tech-stack.md).

The repository `wrangler.jsonc` keeps top-level bindings pointed at local development resources and defines a separate `dev` environment for the shared Cloudflare dev deployment. The current dev deployment is published at `https://dev.codex-hackathons.com`.

Pushes to `main` now publish that shared dev environment automatically through GitHub Actions after the fast CI gate passes. The deploy job applies `bun run db:migrate:dev` and then `bun run deploy:dev` with the repository secrets `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`.

For manual recovery or out-of-band releases, export `CLOUDFLARE_MGMT_TOKEN` and run the same scripts locally. They pass the management token through to Wrangler as `CLOUDFLARE_API_TOKEN`.

The repository also includes a production release workflow. Publishing a GitHub Release triggers `.github/workflows/release-production.yml`, which derives the deployed package version from the release tag, applies production Auth0 and Cloudflare changes, deploys `https://codex-hackathons.com`, and then commits the matching `package.json` version back to `main`.

## Documentation Map

- [`docs/README.md`](docs/README.md): canonical documentation index
- [`docs/design-reference.md`](docs/design-reference.md): how to use the `Figma-Design/` reference correctly
- [`docs/testing-strategy.md`](docs/testing-strategy.md): canonical testing model, including Auth0-backed E2E rules
- [`DEVELOPMENT.md`](DEVELOPMENT.md): contributor setup, local development, validation, and test commands

## Development

Contributor-facing setup and local workflow live in [`DEVELOPMENT.md`](DEVELOPMENT.md), not in this README.
