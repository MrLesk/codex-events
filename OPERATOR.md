# Operator Guide

Codex Events is a self-hosted event platform. This guide takes you from empty Cloudflare, Auth0, and GitHub accounts to a running production deployment, then through first-run setup.

## 1. Introduction

### How it fits together

Three systems, three jobs:

- **Cloudflare** hosts and runs the platform on Cloudflare Workers, with Cloudflare D1, Cloudflare R2, Cloudflare Queues, and Cloudflare Email Service.
- **Auth0** handles login and identity.
- **GitHub Actions** is the deployer. You store your Cloudflare and Auth0 credentials in a GitHub environment, and a workflow builds everything from them.

So most of your work is: **collect credentials** from Cloudflare (section 2) and Auth0 (section 3), **store them in GitHub** (section 4), then **trigger a deploy** (section 5):

- **Production** deploys when you publish a **GitHub Release** (the `deploy-production` workflow).
- **Test** is optional — a separate environment to preview code changes without affecting production. It deploys on every push to `main` once a `test` GitHub environment exists; see [section 6](#6-advanced-settings).

The deploy workflow creates anything that is missing — Cloudflare resources, Auth0 configuration, DNS records — and reconciles it on every run. You do not configure callback URLs, DNS records, or resource names by hand.

### Prerequisites

You need:

- a GitHub repository that can run GitHub Actions (you can just fork this repo);
- a Cloudflare account. The Workers Free plan can host the app for a small event (around 50 participants), but sending the platform's participant emails (application decisions, outcomes, and winner notices) requires the **Workers Paid plan** ($5/month), so choose the Paid plan for any real event;
- a domain managed by Cloudflare DNS (it can be registered elsewhere);
- Cloudflare access to Workers, D1, R2, Images, Queues, Cron Triggers, DNS, and Email Service;
- an Auth0 account. The free plan is enough for the application flow, but Auth0 may require billing verification before it creates a custom domain.

### Hostnames

Each environment has its own app hostname; the Auth0 login screen defaults to that hostname prefixed with `auth.`. The test rows apply only if you enable the optional [test environment](#6-advanced-settings).

| Purpose | Example |
| --- | --- |
| Production app | `events.example.com` |
| Auth0 login | `auth.events.example.com` |
| Test app (optional) | `test.events.example.com` |
| Test Auth0 login (optional) | `auth.test.events.example.com` |

## 2. Cloudflare

In the Cloudflare account that will host the platform:

1. Add the domain to Cloudflare DNS and wait until the zone is active.
2. Configure Cloudflare Email Sending/Routing Service for that domain, and note the sender address you will send from.

You do not set up the D1 database, R2 buckets, or Queues yourself — the deploy workflow creates them when they do not already exist. The Cloudflare API token is created later, in the GitHub step (section 4), where it is pasted straight in.

## 3. Auth0

Auth0 has two hostnames that are easy to confuse:

- **Tenant domain** (e.g. `your-tenant.eu.auth0.com`) — the tenant's own hostname, used for management automation.
- **Login domain** (e.g. `auth.events.example.com`) — the branded hostname users see when they log in: your app hostname prefixed with `auth.` by default. The deploy workflow provisions this custom domain, writes the Cloudflare DNS verification record (DNS-only, not proxied), and waits for Auth0 to verify it.

### 3.1 Tenant

Create or choose an Auth0 tenant for production.

> **Each environment needs its own Auth0 tenant.** Production and the optional [test environment](#6-advanced-settings) **cannot share one tenant** on Auth0's free or standard plans: each needs its own custom login domain, but those plans allow only **one custom domain per tenant** (multiple custom domains is Enterprise-only). Putting two apps in one tenant does not get around this — the login domain, Universal Login branding, and post-login Action are all tenant-level, so the environments would clobber each other on every deploy and share one user pool. Create a separate tenant for test.

### 3.2 Application

Create or choose a **Regular Web Application** for Codex Events. (The Auth0-created default application is usually a Regular Web Application and you can use it if you are comfortable dedicating it to this platform.)

Auth0 usually creates a database connection named `Username-Password-Authentication` and enables it by default; just confirm it's enabled for this application. To offer social sign-in (e.g. Google or GitHub), configure those connections for the application too.

The deploy workflow configures the application's callback URLs, logout URLs, web origins, login URI, Universal Login branding, signup prompt behavior, and post-login Action — you do not set these by hand.

### 3.3 Management access

Create a **Machine-to-Machine** application authorized for the Auth0 Management API. The deploy workflow uses it to apply the configuration above; it is never uploaded to the Cloudflare Worker.

Grant these Management API scopes:

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
- `update:users`
- `read:actions`
- `create:actions`
- `update:actions`
- `read:triggers`
- `update:triggers`

## 4. GitHub

In GitHub, create an environment named `production`, then add the variables and secrets below. The **Where to find it** column tells you where each value comes from, so you can gather them as you fill the form.

Variable names follow a convention worth knowing:

- `NUXT_*` are the application's runtime configuration, copied into the Worker.
- `AUTH0_*` (without `NUXT_`) are used by the deploy workflow to configure Auth0 and are not copied into the Worker.
- `CF_*` values cover Cloudflare credentials, resource names, and DNS zone metadata. The deploy tooling passes Wrangler's supported Cloudflare credential names internally.

### Required variables

| Key | Platform | Where to find it |
| --- | --- | --- |
| `BASE_DOMAIN` | - | The hostname the app runs on, e.g. `events.example.com` |
| `CF_ZONE_NAME` | Cloudflare | Your Cloudflare DNS zone — usually the parent domain, e.g. `example.com` |
| `AUTH0_MANAGEMENT_DOMAIN` | Auth0 | The tenant domain from section 3.1, e.g. `your-tenant.eu.auth0.com` |
| `NUXT_FIRST_PLATFORM_ADMIN_EMAIL` | - | Email of the person who will be the first platform admin |
| `NUXT_OUTBOUND_EMAIL_FROM_EMAIL` | Cloudflare | The sender address you verified in Cloudflare Email (section 2) |
| `NUXT_OUTBOUND_EMAIL_REPLY_TO` | - | Reply-to address for outbound email |

Add these only when they apply:

| Key | Platform | Where to find it |
| --- | --- | --- |
| `AUTH0_CUSTOM_DOMAIN` | Auth0 | Only if your login hostname is not `auth.<BASE_DOMAIN>`, e.g. `auth.example.com` |
| `NUXT_AUTH0_DATABASE_CONNECTION_NAME` | Auth0 | Only if your database connection is not named `Username-Password-Authentication` |

### Required secrets

| Key | Platform | Where to find it |
| --- | --- | --- |
| `CF_ACCOUNT_ID` | Cloudflare | Cloudflare dashboard → account ID |
| `CF_API_TOKEN` | Cloudflare | Create a token with the permissions in [Cloudflare API token](#cloudflare-api-token) below — copy it immediately, it is shown only once |
| `NUXT_AUTH0_CLIENT_ID` | Auth0 | Your Regular Web Application (section 3.2) |
| `NUXT_AUTH0_CLIENT_SECRET` | Auth0 | Your Regular Web Application (section 3.2) |
| `AUTH0_MGMT_CLIENT_ID` | Auth0 | Your Machine-to-Machine application (section 3.3) |
| `AUTH0_MGMT_CLIENT_SECRET` | Auth0 | Your Machine-to-Machine application (section 3.3) |

The deploy workflow derives `NUXT_AUTH0_SESSION_SECRET` and `NUXT_AUTH0_ACCOUNT_LINK_CHALLENGE_SECRET` automatically from `NUXT_AUTH0_CLIENT_SECRET`, so you do not set them here. Set explicit values only when you need controlled secret rotation (see [section 6](#optional-secrets)).

Add these only when they apply:

| Key | Platform | Where to find it |
| --- | --- | --- |
| `NUXT_AUTH0_AUDIENCE` | Auth0 | Only if the application requests an Auth0 API audience |
| `NUXT_LUMA_API_KEY` | Luma | Only if events use Luma sync |

### Cloudflare API token

Create a custom Cloudflare API token for the deploy workflow, then paste it into `CF_API_TOKEN` above. Cloudflare shows the value only once, so copy it as you create it.

Cloudflare edit access does not consistently include read access, so keep both levels where shown.

| Scope | Resource | Access |
| --- | --- | --- |
| Account | Workers Scripts | Read, Edit |
| Account | D1 | Read, Edit |
| Account | Workers R2 Storage | Read, Edit |
| Account | Queues | Read, Edit |
| Account | Cloudflare Images | Read, Edit |
| Zone | Zone | Read |
| Zone | Workers Routes | Read, Edit |
| Zone | DNS | Read, Edit |

Scope the zone permissions to the DNS zone you used for `CF_ZONE_NAME`.

For resource-name overrides, sender display names, queue tuning, the test environment, or manual deploys, see [section 6](#6-advanced-settings).

## 5. Release and first start

### 5.1 Deploy production

Publish a **GitHub Release** from the commit you want to deploy. That triggers the `deploy-production` workflow, which:

1. provisions the Auth0 custom domain and its Cloudflare DNS verification record, and waits for verification;
2. creates or reuses the D1 database, R2 buckets, and Cloudflare Queues;
3. uploads the Worker secrets;
4. applies the Auth0 application, branding, URL, and Action configuration;
5. runs D1 migrations;
6. deploys the Worker and reconciles its Queue consumers.

If Auth0 rejects custom-domain creation because the tenant needs billing verification, add billing information in Auth0 and rerun the release workflow — it cannot finish custom-domain setup until Auth0 allows it for that tenant.

### 5.2 Create the first platform admin

Open `https://<BASE_DOMAIN>/account/platform-settings?tab=legal` and sign in with the email you set as `NUXT_FIRST_PLATFORM_ADMIN_EMAIL`.

A fresh deployment has no Privacy Policy or Platform Terms yet, so registration opens in a legal-setup state. Create the setup account there. Because no platform admin exists yet, the application grants this account platform-admin access automatically.

This account can reach the Legal settings tab right away. Everything else stays blocked until the Privacy Policy and Platform Terms are published and accepted.

### 5.3 Add platform legal content

On the Legal settings tab:

1. Save the support email and imprint content.
2. Publish the Privacy Policy.
3. Publish the Platform Terms.
4. Accept the current Privacy Policy and Platform Terms when prompted.

The imprint should include the platform operator details, postal address, legal and privacy contacts, accepted contact languages, platform purpose, editorial focus, and any jurisdiction-specific disclosures.

### 5.4 Finish setup in the app

As the first platform admin, use the platform admin workspace to:

1. Add more platform admins.
2. Add event organizers.
3. Create the first event.
4. Configure event terms, schedule, registration, judging, prizes, and staff.

### 5.5 Verify

- `https://<BASE_DOMAIN>` loads.
- `/privacy-policy` shows your Privacy Policy.
- `/terms-and-conditions` shows your Platform Terms.
- `/imprint` shows your operator information.
- `/auth/login` opens Auth0 on `https://auth.<BASE_DOMAIN>` (or your `AUTH0_CUSTOM_DOMAIN`).
- The first platform admin can open `/account/platform-settings?tab=platform-admins`.
- The first platform admin can create an event.

## 6. Advanced settings

Everything in this section is optional for a default production deployment.

### How resources are named

Remote deploys generate ignored Wrangler config files from each GitHub environment's values. Every environment supplies its own `BASE_DOMAIN`; the generator never derives `test.*`, `prod.*`, or any other hostname from an environment name.

For the selected target, the generator derives:

- application URL: `https://<BASE_DOMAIN>`
- Cloudflare route pattern: `<BASE_DOMAIN>`
- Luma webhook URL: `https://<BASE_DOMAIN>/api/public/luma/webhooks`
- resource names as `<RESOURCE_PREFIX>-<ENV_NAME>`

`ENV_NAME` defaults to `prod` for production and `test` for the test target. `RESOURCE_PREFIX` defaults to `codex-events`. Keep `CF_ZONE_NAME` explicit because the DNS zone cannot be inferred safely from a hostname.

| Target | `ENV_NAME` | `RESOURCE_PREFIX` | Worker and D1 default |
| --- | --- | --- | --- |
| Production | `prod` | `codex-events` | `codex-events-prod` |
| Test | `test` | `codex-events` | `codex-events-test` |
| Preview | `preview` | `codex-events` | `codex-events-preview` |

Default production resource names:

| GitHub variable | Cloudflare resource | Default production value |
| --- | --- | --- |
| `CF_WORKER_NAME` | Worker | `codex-events-prod` |
| `CF_D1_DATABASE_NAME` | D1 database | `codex-events-prod` |
| `CF_PROFILE_ICONS_BUCKET` | Profile-icons R2 bucket | `codex-events-prod-profile-icons` |
| `CF_EVENT_IMAGES_BUCKET` | Event-images R2 bucket | `codex-events-prod-event-images` |
| `CF_APPLICATION_REVIEW_EMAIL_QUEUE` | Application decision email queue | `codex-events-prod-application-review-email-delivery` |
| `CF_EVENT_OUTCOME_EMAIL_QUEUE` | Event outcome email queue | `codex-events-prod-event-outcome-email-delivery` |
| `CF_LUMA_SYNC_QUEUE` | Luma sync queue | `codex-events-prod-application-luma-sync` |

### Optional variables

Set any of these in the GitHub environment to override a default.

Deployment defaults and resource names:

| Variable | Value |
| --- | --- |
| `ENV_NAME` | Environment name used in generated resource names. Defaults to `prod` for production |
| `RESOURCE_PREFIX` | Resource-name prefix. Defaults to `codex-events` |
| `CF_WORKER_NAME` | Worker name |
| `CF_D1_DATABASE_NAME` | D1 database name; created if it does not exist |
| `CF_PROFILE_ICONS_BUCKET` | Profile-icons R2 bucket name; created if it does not exist |
| `CF_EVENT_IMAGES_BUCKET` | Event-images R2 bucket name; created if it does not exist |
| `CF_APPLICATION_REVIEW_EMAIL_QUEUE` | Application decision email queue name |
| `CF_EVENT_OUTCOME_EMAIL_QUEUE` | Event outcome email queue name |
| `CF_LUMA_SYNC_QUEUE` | Luma sync queue name |
| `LUMA_WEBHOOK_URL` | Luma webhook URL. Defaults to `https://<BASE_DOMAIN>/api/public/luma/webhooks` |

Auth0 and display:

| Variable | Value |
| --- | --- |
| `AUTH0_CUSTOM_DOMAIN` | Login hostname override. Defaults to `auth.<BASE_DOMAIN>` |
| `AUTH0_APP_DISPLAY_NAME` | Name shown in Auth0-hosted login copy. Defaults to `Codex Events` |
| `NUXT_AUTH0_DATABASE_CONNECTION_NAME` | Auth0 database connection name. Defaults to `Username-Password-Authentication` |

Outbound email and queues:

| Variable | Value |
| --- | --- |
| `NUXT_OUTBOUND_EMAIL_BINDING` | Worker Email Service binding name. Defaults to `EMAIL` |
| `NUXT_OUTBOUND_EMAIL_FROM_NAME` | Sender display name. Defaults to `Codex Events` |
| `NUXT_APPLICATION_REVIEW_EMAILS_QUEUE_BINDING` | Binding for application decision emails. Defaults to `APPLICATION_REVIEW_EMAIL_QUEUE` |
| `NUXT_APPLICATION_REVIEW_EMAILS_RETRY_DELAY_SECONDS` | Retry delay for application decision email jobs. Defaults to `120` |
| `NUXT_EVENT_OUTCOME_EMAILS_QUEUE_BINDING` | Binding for event outcome emails. Defaults to `EVENT_OUTCOME_EMAIL_QUEUE` |
| `NUXT_EVENT_OUTCOME_EMAILS_RETRY_DELAY_SECONDS` | Retry delay for event outcome email jobs. Defaults to `120` |
| `NUXT_LUMA_QUEUE_BINDING` | Binding for Luma sync jobs. Defaults to `APPLICATION_LUMA_SYNC_QUEUE` |
| `NUXT_LUMA_RETRY_DELAY_SECONDS` | Retry delay for Luma sync jobs. Defaults to `120` |

### Optional secrets

| Secret | Value |
| --- | --- |
| `NUXT_AUTH0_SESSION_SECRET` | Override for the generated Auth0 session secret. Defaults to a stable value derived from `NUXT_AUTH0_CLIENT_SECRET` |
| `NUXT_AUTH0_ACCOUNT_LINK_CHALLENGE_SECRET` | Override for the generated account-link challenge secret shared by the Worker and Auth0 Action. Defaults to a stable value derived from `NUXT_AUTH0_CLIENT_SECRET` |
| `NUXT_AUTH0_AUDIENCE` | Auth0 API audience when the application requests one |
| `NUXT_LUMA_API_KEY` | Luma API key when events use Luma sync |

### Test environment

Create a GitHub environment named `test` only if pushes to `main` should deploy a test instance. The `deploy-test` job runs on every push to `main` but exits cleanly when the `test` environment has no `BASE_DOMAIN`, so creating the environment is what switches test deploys on. Without it, pushes to `main` only run CI.

Use environment-specific values for the same variable and secret groups as production, with `BASE_DOMAIN` set to the test app hostname. The test job defaults `ENV_NAME` to `test`. Like production, it configures `auth.<BASE_DOMAIN>` by default, writes the DNS-only verification record, and waits for Auth0 verification; set `AUTH0_CUSTOM_DOMAIN` only when the test login hostname should differ.

Test requires its own Auth0 tenant — production and test cannot share one on the free or standard plans (see [section 3.1](#31-tenant)). Point the test environment's `AUTH0_MANAGEMENT_DOMAIN`, `NUXT_AUTH0_CLIENT_ID`, and `NUXT_AUTH0_CLIENT_SECRET` at that tenant and its application.

Required test variables:

| Variable | Value |
| --- | --- |
| `BASE_DOMAIN` | Test app hostname |
| `CF_ZONE_NAME` | Cloudflare DNS zone name |
| `AUTH0_MANAGEMENT_DOMAIN` | Test Auth0 tenant hostname |
| `NUXT_FIRST_PLATFORM_ADMIN_EMAIL` | First platform admin email for test |
| `NUXT_OUTBOUND_EMAIL_FROM_EMAIL` | Verified test sender address |
| `NUXT_OUTBOUND_EMAIL_REPLY_TO` | Reply-to email address |

Required test secrets:

| Secret | Value |
| --- | --- |
| `CF_ACCOUNT_ID` | Cloudflare account ID |
| `CF_API_TOKEN` | Cloudflare API token |
| `NUXT_AUTH0_CLIENT_ID` | Test Auth0 application client ID |
| `NUXT_AUTH0_CLIENT_SECRET` | Test Auth0 application client secret |
| `AUTH0_MGMT_CLIENT_ID` | Auth0 Management application client ID |
| `AUTH0_MGMT_CLIENT_SECRET` | Auth0 Management application client secret |

As with production, the test job derives the session and account-link secrets from `NUXT_AUTH0_CLIENT_SECRET` when overrides are omitted. Set `NUXT_AUTH0_AUDIENCE` only when the test application uses a non-empty audience, and `NUXT_LUMA_API_KEY` only when test events use Luma sync.

### Manual deployment

For a manual remote deploy, export the target environment values and run:

```bash
bun run db:migrate:test
bun run deploy:test
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

## References

- Auth0 custom domains: https://auth0.com/docs/customize/custom-domains
- Cloudflare DNS proxy status: https://developers.cloudflare.com/dns/proxy-status/
- Cloudflare R2 public buckets: https://developers.cloudflare.com/r2/data-access/public-buckets/
- GitHub deployment environments: https://docs.github.com/actions/deployment/targeting-different-environments/using-environments-for-deployment
