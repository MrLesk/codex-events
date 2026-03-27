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
- `NUXT_PROFILE_ICONS_BINDING`
- `NUXT_HACKATHON_IMAGES_BINDING`

For your Auth0 Regular Web Application, configure callback and logout URLs for the domain where you run this app. For example:

- Callback URL: `https://your-domain.example/auth/callback`
- Logout URL: `https://your-domain.example`

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
- optional Auth0 Universal Login branding sync (colors/logo/favicon) when branding env vars are provided
- signup prompt links and required consent checkbox partial
- post-login Action code/deployment for consent claims
- post-login Action binding
- required Auth0 application callback/logout/origin URLs
- Auth0 application default login URI (`initiate_login_uri`) for password-reset return navigation
- Auth0 tenant default redirection URI (`default_redirection_uri`) as fallback return navigation

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

## Documentation Map

- [`docs/README.md`](docs/README.md): canonical documentation index
- [`docs/design-reference.md`](docs/design-reference.md): how to use the `Figma-Design/` reference correctly
- [`docs/testing-strategy.md`](docs/testing-strategy.md): canonical testing model, including Auth0-backed E2E rules
- [`DEVELOPMENT.md`](DEVELOPMENT.md): contributor setup, local development, validation, and test commands

## Development

Contributor-facing setup and local workflow live in [`DEVELOPMENT.md`](DEVELOPMENT.md), not in this README.
