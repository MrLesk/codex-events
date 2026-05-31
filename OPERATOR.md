# Operator Guide

Use this guide to deploy Codex Events from a clean Cloudflare, Auth0, and GitHub setup with the default production resource names.

For custom resource names, shared dev deployments, BDD environments, optional Luma settings, and runtime tuning, use [OPERATOR-ADVANCED.md](OPERATOR-ADVANCED.md).

## Prerequisites

You need:

- a GitHub repository that can run GitHub Actions;
- a Cloudflare account with an active DNS zone for the platform domain and a Workers plan suitable for production traffic;
- a domain managed by Cloudflare DNS. The domain can be registered somewhere else;
- Cloudflare access to Workers, D1, R2, Images, Queues, Cron Triggers, DNS, and Email Service;
- an Auth0 account. The Auth0 free plan is enough for the application flow, but Auth0 may require billing verification before it creates a custom domain;
- local access to `openssl` or another secure random secret generator.

Example hostnames used below:

| Purpose | Example |
| --- | --- |
| Production app | `events.example.com` |
| Auth0 login domain | `auth.events.example.com` |

## 1. Create Cloudflare Resources

In the Cloudflare account that will host the platform:

1. Add the domain to Cloudflare DNS and wait until the zone is active.
2. Configure Cloudflare Email Sending/Routing Service for that domain.
3. Create a custom Cloudflare API token for the production deploy workflow with the permissions listed below.

Cloudflare edit access does not consistently include read access, so keep both access levels where shown.

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

Scope the account permissions to the Cloudflare account that owns the Worker, D1 database, R2 buckets, Images binding, and Queues. Scope the zone permissions to the DNS zone name you use in `DEPLOY_CF_ZONE_NAME`.

The production workflow creates the D1 database, R2 buckets, and Cloudflare Queues when they do not already exist.

## 2. Create Auth0 Resources

Create or choose an Auth0 tenant for production.

Save the tenant domain as `AUTH0_MANAGEMENT_DOMAIN`. This is the Auth0 tenant hostname, not the custom login domain.

Example:

```text
your-tenant.eu.auth0.com
```

The default Auth0 login hostname is `auth.<DEPLOY_BASE_DOMAIN>`.

Example:

```text
auth.events.example.com
```

The dev and production deploy workflows configure the Auth0 custom domain, write the required Cloudflare DNS CNAME record as DNS-only, wait for Auth0 verification, and then use that hostname for login.

Set `DEPLOY_AUTH0_CUSTOM_DOMAIN` only when the login hostname is not `auth.<DEPLOY_BASE_DOMAIN>`. If the custom domain already exists, keep using the same hostname. In Cloudflare DNS, the Auth0 CNAME must stay DNS-only, not proxied.

## 3. Configure The Auth0 Application

In Auth0, create or choose a Regular Web Application for Codex Events. You can use the Auth0-created default application if it is a Regular Web Application and you are comfortable dedicating it to this platform.

Save:

| Value | GitHub secret |
| --- | --- |
| Application client ID | `NUXT_AUTH0_CLIENT_ID` |
| Application client secret | `NUXT_AUTH0_CLIENT_SECRET` |

The release workflow configures the required callback URLs, logout URLs, web origins, login URI, Universal Login branding, signup prompt behavior, and post-login Action for this application.

Create or choose the database connection used for username/password sign-in. Save the connection name as `NUXT_AUTH0_DATABASE_CONNECTION_NAME` when it is not the default connection name.

Example:

```text
Username-Password-Authentication
```

Enable the database connection for the Codex Events application. Configure social connections separately if the deployment supports social sign-in.

## 4. Configure Auth0 Management Access

Create a Machine-to-Machine application in Auth0 for tenant automation and authorize it for the Auth0 Management API.

Save:

| Value | GitHub secret |
| --- | --- |
| Machine-to-Machine client ID | `AUTH0_MGMT_CLIENT_ID` |
| Machine-to-Machine client secret | `AUTH0_MGMT_CLIENT_SECRET` |

Grant these Auth0 Management API scopes:

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

These credentials are used by GitHub Actions and Auth0 Actions setup. They are not uploaded to the Cloudflare Worker runtime.

## 5. Create GitHub Production Environment

In GitHub, create an environment named `production`.

Add these production environment variables:

| Variable | Source | Example |
| --- | --- | --- |
| `DEPLOY_BASE_DOMAIN` | Production app hostname | `events.example.com` |
| `DEPLOY_CF_ZONE_NAME` | Cloudflare DNS zone name from step 1 | `example.com` |
| `AUTH0_MANAGEMENT_DOMAIN` | Auth0 tenant domain from step 2 | `your-tenant.eu.auth0.com` |
| `NUXT_FIRST_PLATFORM_ADMIN_EMAIL` | Email address for the first platform admin | `admin@example.com` |
| `NUXT_OUTBOUND_EMAIL_FROM_EMAIL` | Verified Cloudflare Email sender from step 1 | `events@example.com` |
| `NUXT_OUTBOUND_EMAIL_REPLY_TO` | Reply-to address for outbound email | `support@example.com` |

If the Auth0 login hostname is not `auth.<DEPLOY_BASE_DOMAIN>`, also set:

| Variable | Source | Example |
| --- | --- | --- |
| `DEPLOY_AUTH0_CUSTOM_DOMAIN` | Auth0 login hostname override | `auth.example.com` |

If the Auth0 database connection is not named `Username-Password-Authentication`, also set:

| Variable | Source | Example |
| --- | --- | --- |
| `NUXT_AUTH0_DATABASE_CONNECTION_NAME` | Auth0 database connection from step 3 | `Username-Password-Authentication` |

Add these production environment secrets:

| Secret | Source | Example |
| --- | --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID from step 1 | `0123456789abcdef0123456789abcdef` |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token from step 1 | Token value |
| `NUXT_AUTH0_CLIENT_ID` | Auth0 Regular Web Application client ID from step 3 | Client ID |
| `AUTH0_MGMT_CLIENT_ID` | Auth0 Management API application client ID from step 4 | Client ID |
| `AUTH0_MGMT_CLIENT_SECRET` | Auth0 Management API application client secret from step 4 | Client secret |
| `NUXT_AUTH0_CLIENT_SECRET` | Auth0 Regular Web Application client secret from step 3 | Client secret |
| `NUXT_AUTH0_SESSION_SECRET` | Output of `openssl rand -hex 64` | Generated secret |
| `NUXT_AUTH0_ACCOUNT_LINK_CHALLENGE_SECRET` | Output of `openssl rand -hex 32` | Generated secret |

Set these secrets only when the deployment uses them:

| Secret | Source | Example |
| --- | --- | --- |
| `NUXT_AUTH0_AUDIENCE` | Auth0 API audience when the application requests one | Audience URL |
| `NUXT_LUMA_API_KEY` | Luma API key when events use Luma sync | API key |

For resource-name overrides, custom sender display names, shared dev, or BDD configuration, use [OPERATOR-ADVANCED.md](OPERATOR-ADVANCED.md).

## 6. Deploy Production

Publish a GitHub Release from the commit you want to deploy.

The `release-production` workflow:

1. configures the Auth0 custom domain and Cloudflare DNS verification record;
2. creates or finds the production D1 database;
3. creates or finds the production R2 buckets;
4. creates required Cloudflare Queues;
5. uploads Worker secrets;
6. applies Auth0 application, branding, URL, and Action configuration;
7. runs production D1 migrations;
8. deploys the Cloudflare Worker;
9. reconciles the Worker Queue consumers.

If Auth0 rejects custom-domain creation because the tenant needs billing verification, add the required billing information in Auth0 and rerun the release workflow.

## 7. Create The First Platform Admin

Open `https://<DEPLOY_BASE_DOMAIN>/account/platform-settings?tab=legal` and sign in with the email address configured in `NUXT_FIRST_PLATFORM_ADMIN_EMAIL`.

When the deployment has no current Privacy Policy or Platform Terms yet, account registration shows the legal-content setup state. Create the setup account there. The application grants platform-admin access automatically when no active platform admin exists.

The setup account can access the platform settings legal tab before accepting platform documents. Other account and event workflows remain blocked until the current Privacy Policy and Platform Terms are published and accepted.

## 8. Add Platform Legal Content

In Platform settings, use the Legal settings tab to:

1. Save the support email and imprint content.
2. Publish the Privacy Policy.
3. Publish the Platform Terms.

The imprint content should include the platform operator details, postal address, legal and privacy contact information, accepted contact languages, platform purpose, editorial focus, and jurisdiction-specific disclosures.

After both platform documents are published, accept the current Privacy Policy and Platform Terms when the account workflow prompts for consent.

## 9. Finish Setup In The App

Open the account workspace as the first platform admin.

Use the platform admin workspace to:

1. Add more platform admins.
2. Add event organizers.
3. Create the first event.
4. Configure event terms, schedule, registration, judging, prizes, and staff.

## 10. Verify Production

Check:

- `https://<DEPLOY_BASE_DOMAIN>` loads.
- `/privacy-policy` shows your Privacy Policy.
- `/terms-and-conditions` shows your Platform Terms.
- `/imprint` shows your operator information.
- `/auth/login` opens Auth0 on `https://auth.<DEPLOY_BASE_DOMAIN>` or the configured `DEPLOY_AUTH0_CUSTOM_DOMAIN`.
- The first platform admin can access `/account/platform-settings?tab=platform-admins`.
- The first platform admin can create an event.

## Default Production Resource Names

The default resource name format is `<DEPLOY_RESOURCE_PREFIX>-<DEPLOY_ENV_NAME>` for every environment, including production. These optional GitHub environment variables control the Cloudflare resource names; omit them to use the defaults:

| GitHub variable | Cloudflare resource | Default production value |
| --- | --- | --- |
| `DEPLOY_CF_WORKER_NAME` | Worker | `codex-events-prod` |
| `DEPLOY_CF_D1_DATABASE_NAME` | D1 database | `codex-events-prod` |
| `DEPLOY_CF_PROFILE_ICONS_BUCKET` | Profile-icons R2 bucket | `codex-events-prod-profile-icons` |
| `DEPLOY_CF_EVENT_IMAGES_BUCKET` | Event-images R2 bucket | `codex-events-prod-event-images` |
| `DEPLOY_CF_APPLICATION_REVIEW_EMAIL_QUEUE` | Application decision email queue | `codex-events-prod-application-review-email-delivery` |
| `DEPLOY_CF_EVENT_OUTCOME_EMAIL_QUEUE` | Event outcome email queue | `codex-events-prod-event-outcome-email-delivery` |
| `DEPLOY_CF_LUMA_SYNC_QUEUE` | Luma sync queue | `codex-events-prod-application-luma-sync` |

## References

- Auth0 custom domains: https://auth0.com/docs/customize/custom-domains
- Cloudflare DNS proxy status: https://developers.cloudflare.com/dns/proxy-status/
- Cloudflare R2 public buckets: https://developers.cloudflare.com/r2/data-access/public-buckets/
- GitHub deployment environments: https://docs.github.com/actions/deployment/targeting-different-environments/using-environments-for-deployment
