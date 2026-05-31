# Advanced Operator Reference

Use this reference when a deployment needs custom resource names, shared dev environments, BDD test automation, optional Luma settings, or runtime tuning. For a default production deployment, start with [OPERATOR.md](OPERATOR.md).

## Deployment Defaults

Remote deployments generate ignored Wrangler config files from each GitHub environment's values.

Each environment provides its own `BASE_DOMAIN`. The generator never derives `dev.*`, `prod.*`, or any other hostname from an environment name.

For the selected target, the generator derives:

- application URL: `https://<BASE_DOMAIN>`
- Cloudflare route pattern: `<BASE_DOMAIN>`
- Luma webhook URL: `https://<BASE_DOMAIN>/api/public/luma/webhooks`
- resource names from `DEPLOY_ENV_NAME` and `DEPLOY_RESOURCE_PREFIX`

`DEPLOY_ENV_NAME` defaults to `dev` for the shared dev target and `prod` for the production target. `DEPLOY_RESOURCE_PREFIX` defaults to `codex-events`. Default resource names use `<DEPLOY_RESOURCE_PREFIX>-<DEPLOY_ENV_NAME>` for every environment.

Examples:

| Target | `DEPLOY_ENV_NAME` | `DEPLOY_RESOURCE_PREFIX` | Worker and D1 default |
| --- | --- | --- | --- |
| Production | `prod` | `codex-events` | `codex-events-prod` |
| Dev | `dev` | `codex-events` | `codex-events-dev` |
| Preview | `preview` | `codex-events` | `codex-events-preview` |

Keep `DEPLOY_CF_ZONE_NAME` explicit because the Cloudflare DNS zone cannot be inferred safely from a deployment hostname. `AUTH0_CUSTOM_DOMAIN` is optional and defaults to `auth.<BASE_DOMAIN>`.

## Advanced Production Variables

These variables are optional in the GitHub `production` environment.

Deployment defaults:

| Variable | Value |
| --- | --- |
| `DEPLOY_ENV_NAME` | Environment name used in generated resource names. Defaults to `prod` for production |
| `DEPLOY_RESOURCE_PREFIX` | Resource name prefix. Defaults to `codex-events` |

Cloudflare resource name overrides:

| Variable | Value |
| --- | --- |
| `DEPLOY_CF_WORKER_NAME` | Cloudflare Worker name |
| `DEPLOY_CF_D1_DATABASE_NAME` | D1 database name. The workflow creates this database if it does not already exist |
| `DEPLOY_CF_PROFILE_ICONS_BUCKET` | Profile-icons R2 bucket name. The workflow creates this bucket if it does not already exist |
| `DEPLOY_CF_EVENT_IMAGES_BUCKET` | Event-images R2 bucket name. The workflow creates this bucket if it does not already exist |
| `DEPLOY_CF_APPLICATION_REVIEW_EMAIL_QUEUE` | Application decision email queue name |
| `DEPLOY_CF_EVENT_OUTCOME_EMAIL_QUEUE` | Event outcome email queue name |
| `DEPLOY_CF_LUMA_SYNC_QUEUE` | Luma sync queue name |

Auth0 and display settings:

| Variable | Value |
| --- | --- |
| `AUTH0_CUSTOM_DOMAIN` | Auth0 login hostname override. Defaults to `auth.<BASE_DOMAIN>` |
| `AUTH0_APP_DISPLAY_NAME` | Display name shown in Auth0-hosted login copy. Defaults to `Codex Events` |
| `NUXT_AUTH0_DATABASE_CONNECTION_NAME` | Auth0 database connection name. Defaults to `Username-Password-Authentication` |

Platform bootstrap setting:

| Variable | Value |
| --- | --- |
| `NUXT_FIRST_PLATFORM_ADMIN_EMAIL` | Email address to promote automatically when no active platform admin exists |

Cloudflare Email Service settings:

| Variable | Value |
| --- | --- |
| `NUXT_OUTBOUND_EMAIL_BINDING` | Worker Email Service binding name. Defaults to `EMAIL` |
| `NUXT_OUTBOUND_EMAIL_FROM_NAME` | Sender display name. Defaults to `Codex Events` |

Queue settings:

| Variable | Value |
| --- | --- |
| `NUXT_APPLICATION_REVIEW_EMAILS_QUEUE_BINDING` | Worker binding for application decision emails. Defaults to `APPLICATION_REVIEW_EMAIL_QUEUE` |
| `NUXT_APPLICATION_REVIEW_EMAILS_RETRY_DELAY_SECONDS` | Retry delay for application decision email jobs. Defaults to `120` |
| `NUXT_EVENT_OUTCOME_EMAILS_QUEUE_BINDING` | Worker binding for event outcome emails. Defaults to `EVENT_OUTCOME_EMAIL_QUEUE` |
| `NUXT_EVENT_OUTCOME_EMAILS_RETRY_DELAY_SECONDS` | Retry delay for event outcome email jobs. Defaults to `120` |
| `NUXT_LUMA_QUEUE_BINDING` | Worker binding for Luma sync jobs. Defaults to `APPLICATION_LUMA_SYNC_QUEUE` |
| `NUXT_LUMA_RETRY_DELAY_SECONDS` | Retry delay for Luma sync jobs. Defaults to `120` |

Deployment URL override:

| Variable | Value |
| --- | --- |
| `DEPLOY_LUMA_WEBHOOK_URL` | Override for the Luma webhook URL. Defaults to `https://<BASE_DOMAIN>/api/public/luma/webhooks` |

Optional secrets:

| Secret | Value |
| --- | --- |
| `NUXT_AUTH0_AUDIENCE` | Auth0 API audience when the application requests one |
| `NUXT_LUMA_API_KEY` | Luma API key when events use Luma sync |

## Shared Dev Environment

Create a GitHub environment named `dev` only if pushes to `main` should deploy a shared dev instance.

Use environment-specific values for the same variable and secret groups as production. Set `BASE_DOMAIN` to the dev app hostname. The dev workflow defaults `DEPLOY_ENV_NAME` to `dev`; set it only when you need a different resource prefix.

Use `NUXT_AUTH0_CLIENT_ID` for the Auth0 Regular Web Application client ID in every GitHub environment.

Use a separate Auth0 tenant or application for dev when you want to keep dev users, callback URLs, Actions, and database connections separate from production.

Required dev variables:

| Variable | Value |
| --- | --- |
| `BASE_DOMAIN` | Dev app hostname |
| `DEPLOY_CF_ZONE_NAME` | Cloudflare DNS zone name |
| `AUTH0_MANAGEMENT_DOMAIN` | Dev Auth0 tenant hostname |
| `NUXT_FIRST_PLATFORM_ADMIN_EMAIL` | First platform admin email for the dev instance |
| `NUXT_OUTBOUND_EMAIL_FROM_EMAIL` | Verified dev sender address |
| `NUXT_OUTBOUND_EMAIL_REPLY_TO` | Reply-to email address |

The shared dev deploy workflow configures `auth.<BASE_DOMAIN>` by default, writes the required Cloudflare DNS CNAME record as DNS-only, and waits for Auth0 verification before applying Auth0 application settings. Set `AUTH0_CUSTOM_DOMAIN` only when the dev login hostname should be different.

Required dev secrets:

| Secret | Value |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token |
| `NUXT_AUTH0_CLIENT_ID` | Dev Auth0 Regular Web Application client ID |
| `NUXT_AUTH0_CLIENT_SECRET` | Dev Auth0 Regular Web Application client secret |
| `NUXT_AUTH0_SESSION_SECRET` | Output of `openssl rand -hex 64` |
| `NUXT_AUTH0_ACCOUNT_LINK_CHALLENGE_SECRET` | Output of `openssl rand -hex 32` |
| `AUTH0_MGMT_CLIENT_ID` | Auth0 Management API application client ID |
| `AUTH0_MGMT_CLIENT_SECRET` | Auth0 Management API application client secret |

Set `NUXT_AUTH0_AUDIENCE` only when the dev Auth0 application uses a non-empty audience. Set `NUXT_LUMA_API_KEY` only when dev events use Luma sync.

## BDD Environment

Auth0-backed BDD test automation uses a separate GitHub environment named `bdd`. Configure it only when running the BDD suite in CI.

Required BDD variables:

| Variable | Value |
| --- | --- |
| `AUTH0_MANAGEMENT_DOMAIN` | Auth0 tenant hostname |
| `NUXT_AUTH0_DATABASE_CONNECTION_NAME` | Auth0 database connection name |

Required BDD secrets:

| Secret | Value |
| --- | --- |
| `NUXT_AUTH0_DOMAIN` | Auth0 login hostname used by the BDD app |
| `NUXT_AUTH0_CLIENT_ID` | BDD Auth0 Regular Web Application client ID |
| `NUXT_AUTH0_CLIENT_SECRET` | BDD Auth0 Regular Web Application client secret |
| `NUXT_AUTH0_SESSION_SECRET` | Output of `openssl rand -hex 64` |
| `AUTH0_MGMT_CLIENT_ID` | Auth0 Management API application client ID |
| `AUTH0_MGMT_CLIENT_SECRET` | Auth0 Management API application client secret |
| `E2E_PLATFORM_ADMIN_EMAIL` | Stable platform-admin persona email |
| `E2E_PLATFORM_ADMIN_PASSWORD` | Stable platform-admin persona password |
| `E2E_EVENT_ADMIN_EMAIL` | Stable event-admin persona email |
| `E2E_EVENT_ADMIN_PASSWORD` | Stable event-admin persona password |
| `E2E_JUDGE_EMAIL` | Stable judge persona email |
| `E2E_JUDGE_PASSWORD` | Stable judge persona password |
| `E2E_REGULAR_USER_EMAIL` | Stable regular-user persona email |
| `E2E_REGULAR_USER_PASSWORD` | Stable regular-user persona password |

Set `NUXT_AUTH0_AUDIENCE` only when the BDD Auth0 application uses a non-empty audience.

## Manual Deployment Commands

For manual remote deployment, export the target environment values and run:

```bash
bun run db:migrate:dev
bun run deploy:dev
```

or:

```bash
bun run db:migrate:production
bun run deploy:production
```

When Luma sync is enabled, reconcile the webhook before uploading Worker secrets:

```bash
bun tools/luma/webhook-bootstrap.ts apply --secret-bulk-path .wrangler-luma-webhook-secret.json
```

`LUMA_WEBHOOK_URL` is optional when `NUXT_AUTH0_APP_BASE_URL` is an HTTPS URL; the script derives the webhook URL from that app base URL.
