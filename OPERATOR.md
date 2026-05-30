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
| Auth0 login domain | `auth.example.com` |
| Event image CDN | `media.example.com` |

## 1. Create Cloudflare Resources

In the Cloudflare account that will host the platform:

1. Add the domain to Cloudflare DNS and wait until the zone is active.
2. Configure Cloudflare Email Sending/Routing Service for that domain.
3. Create a custom Cloudflare API token for the production deploy workflow with the permissions listed below.

Use these permissions for the API token from step 3. When a row lists both `Read` and `Edit`, grant both; Cloudflare edit access does not consistently include read access.

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

Keep these values for the GitHub `production` environment in step 5:

| Value | GitHub setting | Example |
| --- | --- | --- |
| Cloudflare account ID | `CLOUDFLARE_ACCOUNT_ID` secret | `0123456789abcdef0123456789abcdef` |
| Cloudflare API token | `CLOUDFLARE_API_TOKEN` secret | Token value |
| DNS zone name | `DEPLOY_CF_ZONE_NAME` variable | `example.com` |
| Verified sender email | `NUXT_OUTBOUND_EMAIL_FROM_EMAIL` variable | `events@example.com` |
| Reply-to email | `NUXT_OUTBOUND_EMAIL_REPLY_TO` variable | `support@example.com` |

The production workflow creates the D1 database, R2 buckets, and Cloudflare Queues when they do not already exist. With the default settings, production uses these Cloudflare resource names:

| Resource | Default name |
| --- | --- |
| Worker | `codex-events` |
| D1 database | `codex-events` |
| Profile-icons R2 bucket | `codex-events-profile-icons` |
| Event-images R2 bucket | `codex-events-event-images` |
| Application decision email queue | `codex-events-application-review-email-delivery` |
| Event outcome email queue | `codex-events-event-outcome-email-delivery` |
| Luma sync queue | `codex-events-application-luma-sync` |

Connect the event-images R2 bucket to a public custom domain only when the deployment serves public gallery images directly from R2. The default setup can serve public event images through Worker routes.

The release workflow deploys the Worker and attaches the required Queue consumers. Inactive Worker consumers in Cloudflare still occupy a queue's single Worker-consumer slot, so the workflow removes existing consumers from each environment-owned queue before adding the deployed Worker back with the configured retry settings.

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

The production release workflow configures the Auth0 custom domain, writes the required Cloudflare DNS CNAME record as DNS-only, waits for Auth0 verification, and then uses that hostname for login.

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

Set these production environment variables:

| Variable | Value |
| --- | --- |
| `DEPLOY_BASE_DOMAIN` | Production app hostname, for example `events.example.com` |
| `DEPLOY_AUTH0_CUSTOM_DOMAIN` | Auth0 login hostname, for example `auth.example.com` |
| `DEPLOY_CF_ZONE_NAME` | Cloudflare DNS zone name |
| `AUTH0_MANAGEMENT_DOMAIN` | Auth0 tenant hostname, for example `your-tenant.eu.auth0.com` |
| `NUXT_OUTBOUND_EMAIL_FROM_EMAIL` | Verified Cloudflare Email Service sender |
| `NUXT_OUTBOUND_EMAIL_REPLY_TO` | Reply-to email address |

If the Auth0 database connection is not named `Username-Password-Authentication`, also set:

| Variable | Value |
| --- | --- |
| `NUXT_AUTH0_DATABASE_CONNECTION_NAME` | Auth0 database connection name |

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

For resource-name overrides, custom sender display names, public R2 CDN URLs, shared dev, or BDD configuration, use [OPERATOR-ADVANCED.md](OPERATOR-ADVANCED.md).

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

## 7. Add Platform Legal Content

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

## 8. Create The First Platform Admin

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

## 9. Finish Setup In The App

Sign in as the first platform admin.

Use the platform admin workspace to:

1. Review legal settings and published platform documents.
2. Add more platform admins.
3. Add event organizers.
4. Create the first event.
5. Configure event terms, schedule, registration, judging, prizes, and staff.

## 10. Verify Production

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
