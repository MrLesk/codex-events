# Operator Guide

Use this guide to deploy Codex Events to production.

## 1. Create Cloudflare Resources

Create these resources in the Cloudflare account that will host the platform:

| Resource | Value to save |
| --- | --- |
| DNS zone | Zone name, for example `example.com` |
| D1 database | Database name and database ID |
| R2 bucket for profile icons | Bucket name |
| R2 bucket for event images | Bucket name |
| Email Service sender | Verified sender email address |
| Cloudflare API token | Token value |

Create a Cloudflare API token with access to Workers, D1, R2, Queues, Worker secrets, and DNS records in the target zone.

## 2. Create Auth0 Resources

Create these resources in Auth0:

| Resource | Value to save |
| --- | --- |
| Regular Web Application | Client ID and client secret |
| Machine-to-Machine application for the Auth0 Management API | Client ID and client secret |
| Database connection | Connection name |

Grant the Auth0 Management API application these scopes:

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

## 3. Configure GitHub Production

Create a GitHub environment named `production`.

Set these environment variables.

Application hostname:

| Variable | Value |
| --- | --- |
| `DEPLOY_PRODUCTION_BASE_DOMAIN` | Production hostname, for example `events.example.com` |

Cloudflare resource metadata:

| Variable | Value |
| --- | --- |
| `DEPLOY_CF_ZONE_NAME` | Cloudflare DNS zone name |
| `DEPLOY_CF_WORKER_NAME` | Cloudflare Worker name |
| `DEPLOY_CF_D1_DATABASE_NAME` | D1 database name |
| `DEPLOY_CF_D1_DATABASE_ID` | D1 database ID |
| `DEPLOY_CF_PROFILE_ICONS_BUCKET` | Profile-icons R2 bucket name |
| `DEPLOY_CF_EVENT_IMAGES_BUCKET` | Event-images R2 bucket name |
| `DEPLOY_CF_APPLICATION_REVIEW_EMAIL_QUEUE` | Application decision email queue name |
| `DEPLOY_CF_EVENT_OUTCOME_EMAIL_QUEUE` | Event outcome email queue name |
| `DEPLOY_CF_LUMA_SYNC_QUEUE` | Luma sync queue name |

Auth0 runtime settings:

| Variable | Value |
| --- | --- |
| `NUXT_AUTH0_MANAGEMENT_DOMAIN` | Auth0 tenant host, without `https://` |
| `NUXT_AUTH0_DATABASE_CONNECTION_NAME` | Auth0 database connection name |

Cloudflare Email Service runtime settings:

| Variable | Value |
| --- | --- |
| `NUXT_OUTBOUND_EMAIL_FROM_EMAIL` | Verified Cloudflare Email Service sender |
| `NUXT_OUTBOUND_EMAIL_REPLY_TO` | Reply-to email address |

Set these environment secrets:

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

If events use Luma sync, also set:

| Secret | Value |
| --- | --- |
| `NUXT_LUMA_API_KEY` | Luma API key |

## 4. Deploy Production

Publish a GitHub Release from the commit you want to deploy.

The `release-production` workflow deploys production.

## 5. Add Platform Legal Content

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

## 6. Create The First Platform Admin

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

## 7. Finish Setup In The App

Sign in as the first platform admin.

Use the platform admin workspace to:

1. Review legal settings and published platform documents.
2. Add more platform admins.
3. Add event organizers.
4. Create the first event.
5. Configure event terms, schedule, registration, judging, prizes, and staff.

## 8. Verify Production

Check:

- `https://<DEPLOY_PRODUCTION_BASE_DOMAIN>` loads.
- `/privacy-policy` shows your Privacy Policy.
- `/terms-and-conditions` shows your Platform Terms.
- `/imprint` shows your operator information.
- `/auth/login` opens Auth0.
- The first platform admin can access `/account/platform-admins`.
- The first platform admin can create an event.
