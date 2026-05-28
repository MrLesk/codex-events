# Operator Guide

Use this guide to deploy Codex Events from a clean Cloudflare, Auth0, and GitHub setup.

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
| Auth0 login domain | `auth.example.com` |
| Event image CDN | `media.example.com` |

Do not create a GitHub variable named `AUTH0_DOMAIN`. This project uses `DEPLOY_AUTH0_CUSTOM_DOMAIN` for the Auth0 login hostname and `AUTH0_MANAGEMENT_DOMAIN` for the Auth0 tenant/API hostname.

## 1. Create Cloudflare Resources

In the Cloudflare account that will host the platform:

1. Add the domain to Cloudflare DNS and wait until the zone is active.
2. Create a D1 database.
3. Create an R2 bucket for profile icons.
4. Create an R2 bucket for event images.
5. Connect the event-images R2 bucket to a public custom domain when the deployment serves public gallery images directly from R2.
6. Configure Cloudflare Email Service and verify the sender address used by the platform.
7. Create a Cloudflare API token for the production deploy workflow.

Save these values:

| Value | Example |
| --- | --- |
| Cloudflare account ID | `0123456789abcdef0123456789abcdef` |
| DNS zone name | `example.com` |
| D1 database name | `codex-events-production` |
| D1 database ID | Cloudflare D1 database UUID |
| Profile-icons R2 bucket name | `codex-events-profile-icons` |
| Event-images R2 bucket name | `codex-events-event-images` |
| Event-images public custom domain | `media.example.com` |
| Verified sender email | `events@example.com` |
| Reply-to email | `support@example.com` |
| Cloudflare API token | Token value |

The release workflow creates the configured Cloudflare Queues if they do not already exist.
The Cloudflare API token must be able to deploy Workers, update Worker secrets and routes, manage D1, R2, and Queues, and edit DNS records in the target zone.

## 2. Create Auth0 Resources

Create or choose an Auth0 tenant for production.

Save the tenant domain as `AUTH0_MANAGEMENT_DOMAIN`. This is the Auth0 tenant hostname, not the custom login domain.

Example:

```text
your-tenant.eu.auth0.com
```

Choose the Auth0 login hostname for the platform and save it as `DEPLOY_AUTH0_CUSTOM_DOMAIN`.

Example:

```text
auth.example.com
```

The production release workflow runs the Auth0 custom-domain bootstrap. It creates or verifies the Auth0 custom domain, writes the required Cloudflare DNS CNAME record as DNS-only, waits for Auth0 verification, and then uses that hostname for login.

If the custom domain already exists, use the same hostname in `DEPLOY_AUTH0_CUSTOM_DOMAIN`. In Cloudflare DNS, the Auth0 CNAME must stay DNS-only, not proxied.

## 3. Configure The Auth0 Application

In Auth0, create or choose a Regular Web Application for Codex Events. You can use the Auth0-created default application if it is a Regular Web Application and you are comfortable dedicating it to this platform.

Save:

| Value | GitHub secret |
| --- | --- |
| Application client ID | `AUTH0_APP_CLIENT_ID` |
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

Set these production environment variables.

Application hostnames:

| Variable | Value |
| --- | --- |
| `DEPLOY_BASE_DOMAIN` | Production app hostname, for example `events.example.com` |
| `DEPLOY_AUTH0_CUSTOM_DOMAIN` | Auth0 login hostname, for example `auth.example.com` |

Required Cloudflare metadata:

| Variable | Value |
| --- | --- |
| `DEPLOY_CF_ZONE_NAME` | Cloudflare DNS zone name |
| `DEPLOY_CF_D1_DATABASE_ID` | D1 database ID |

Deployment defaults:

| Variable | Value |
| --- | --- |
| `DEPLOY_ENV_NAME` | Environment name used in generated resource names. Defaults to `prod` for production |
| `DEPLOY_RESOURCE_PREFIX` | Resource name prefix. Defaults to `codex-events` |

Optional Cloudflare resource name overrides:

| Variable | Value |
| --- | --- |
| `DEPLOY_CF_WORKER_NAME` | Cloudflare Worker name |
| `DEPLOY_CF_D1_DATABASE_NAME` | D1 database name |
| `DEPLOY_CF_PROFILE_ICONS_BUCKET` | Profile-icons R2 bucket name |
| `DEPLOY_CF_EVENT_IMAGES_BUCKET` | Event-images R2 bucket name |
| `DEPLOY_CF_APPLICATION_REVIEW_EMAIL_QUEUE` | Application decision email queue name |
| `DEPLOY_CF_EVENT_OUTCOME_EMAIL_QUEUE` | Event outcome email queue name |
| `DEPLOY_CF_LUMA_SYNC_QUEUE` | Luma sync queue name |

Auth0 settings:

| Variable | Value |
| --- | --- |
| `AUTH0_MANAGEMENT_DOMAIN` | Auth0 tenant hostname, for example `your-tenant.eu.auth0.com` |
| `NUXT_AUTH0_DATABASE_CONNECTION_NAME` | Auth0 database connection name. Defaults to `Username-Password-Authentication` |

Cloudflare Email Service runtime settings:

| Variable | Value |
| --- | --- |
| `NUXT_OUTBOUND_EMAIL_FROM_EMAIL` | Verified Cloudflare Email Service sender |
| `NUXT_OUTBOUND_EMAIL_REPLY_TO` | Reply-to email address |

Optional display and URL settings:

| Variable | Value |
| --- | --- |
| `AUTH0_APP_DISPLAY_NAME` | Display name shown in Auth0-hosted login copy. Defaults to `Codex Events` |
| `NUXT_OUTBOUND_EMAIL_FROM_NAME` | Sender display name. Defaults to `Codex Events` |
| `DEPLOY_EVENT_IMAGES_PUBLIC_CDN_BASE_URL` | Event image public CDN URL. Leave empty to serve public event gallery images through Worker routes |
| `DEPLOY_LUMA_WEBHOOK_URL` | Override for the Luma webhook URL. Defaults to `https://<DEPLOY_BASE_DOMAIN>/api/public/luma/webhooks` |

Set these production environment secrets:

| Secret | Value |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token |
| `AUTH0_APP_CLIENT_ID` | Auth0 Regular Web Application client ID |
| `AUTH0_MGMT_CLIENT_ID` | Auth0 Management API application client ID |
| `AUTH0_MGMT_CLIENT_SECRET` | Auth0 Management API application client secret |
| `NUXT_AUTH0_CLIENT_SECRET` | Auth0 Regular Web Application client secret |
| `NUXT_AUTH0_SESSION_SECRET` | Output of `openssl rand -hex 64` |
| `NUXT_AUTH0_ACCOUNT_LINK_CHALLENGE_SECRET` | Output of `openssl rand -hex 32` |

Set these secrets only when the deployment uses them:

| Secret | Value |
| --- | --- |
| `NUXT_AUTH0_AUDIENCE` | Auth0 API audience when the application requests one |
| `NUXT_LUMA_API_KEY` | Luma API key when events use Luma sync |

## 6. Optional Shared Dev Environment

Create a GitHub environment named `dev` only if pushes to `main` should deploy a shared dev instance.

The dev environment uses the same variable groups as production. Set `DEPLOY_BASE_DOMAIN` to the dev app hostname for that environment, and set `DEPLOY_ENV_NAME=dev` only when you want to override the dev workflow default.

The dev environment secrets mirror production, except the Auth0 application client ID secret is named `NUXT_AUTH0_CLIENT_ID`.

Use a separate Auth0 tenant or application for dev when you want to keep dev users, callback URLs, Actions, and database connections separate from production.

BDD test automation uses a separate GitHub environment named `bdd`; configure it from `DEVELOPMENT.md` only when running Auth0-backed BDD tests in CI.

## 7. Deploy Production

Publish a GitHub Release from the commit you want to deploy.

The `release-production` workflow:

1. configures the Auth0 custom domain and Cloudflare DNS verification record;
2. generates the production Wrangler config;
3. creates required Cloudflare Queues;
4. uploads Worker secrets;
5. applies Auth0 application, branding, URL, and Action configuration;
6. runs production D1 migrations;
7. deploys the Cloudflare Worker.

If Auth0 rejects custom-domain creation because the tenant needs billing verification, add the required billing information in Auth0 and rerun the release workflow.

## 8. Add Platform Legal Content

Open the production D1 database in Cloudflare and run this SQL with your operator details and legal text:

```sql
INSERT INTO platform_legal_settings (
  id,
  support_email,
  imprint_content
) VALUES (
  'default',
  'support@example.com',
  '## Operator

Your Organization
Street Address, City, Country

## Contact

- Support, legal, and privacy contact: support@example.com
- Languages accepted for legal and DSA communications: English

## Platform purpose

Operate event programs and participant workflows.

## Editorial focus

Information about events operated on this platform.

## Legal notice

Your jurisdiction-specific imprint disclosures.'
) ON CONFLICT(id) DO UPDATE SET
  support_email = excluded.support_email,
  imprint_content = excluded.imprint_content,
  updated_at = CURRENT_TIMESTAMP;

INSERT OR IGNORE INTO platform_documents (
  id,
  document_type,
  version,
  title,
  content,
  published_at
) VALUES
  (
    'privacy-policy-v1',
    'privacy_policy',
    1,
    'Privacy Policy',
    'Your current Privacy Policy content.',
    CURRENT_TIMESTAMP
  ),
  (
    'platform-terms-v1',
    'platform_terms',
    1,
    'Platform Terms',
    'Your current Platform Terms content.',
    CURRENT_TIMESTAMP
  );
```

## 9. Create The First Platform Admin

Open the production site and sign in with the account that should become the first platform admin.

After the account registration finishes, open the production D1 database in Cloudflare and run:

```sql
UPDATE users
SET
  is_platform_admin = 1,
  updated_at = CURRENT_TIMESTAMP
WHERE lower(email) = lower('admin@example.com')
  AND deleted_at IS NULL;
```

Replace `admin@example.com` with the first admin's email address.

## 10. Finish Setup In The App

Sign in as the first platform admin.

Use the platform admin workspace to:

1. Review legal settings and published platform documents.
2. Add more platform admins.
3. Add event organizers.
4. Create the first event.
5. Configure event terms, schedule, registration, judging, prizes, and staff.

## 11. Verify Production

Check:

- `https://<DEPLOY_BASE_DOMAIN>` loads.
- `/privacy-policy` shows your Privacy Policy.
- `/terms-and-conditions` shows your Platform Terms.
- `/imprint` shows your operator information.
- `/auth/login` opens Auth0 on `https://<DEPLOY_AUTH0_CUSTOM_DOMAIN>`.
- The first platform admin can access `/account/platform-admins`.
- The first platform admin can create an event.

## References

- Auth0 custom domains: https://auth0.com/docs/customize/custom-domains
- Cloudflare DNS proxy status: https://developers.cloudflare.com/dns/proxy-status/
- Cloudflare R2 public buckets: https://developers.cloudflare.com/r2/data-access/public-buckets/
- GitHub deployment environments: https://docs.github.com/actions/deployment/targeting-different-environments/using-environments-for-deployment
