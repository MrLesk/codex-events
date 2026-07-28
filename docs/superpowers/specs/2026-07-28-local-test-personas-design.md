# Local Test Personas Design

## Goal

BDD and the local load runner authenticate fixed test personas without an
Auth0 tenant, credentials, passwords, browser login, or external network
requests. Production authentication remains Auth0.

The test identity mechanism identifies a persona only. Platform and event
permissions continue to come exclusively from D1 fixture data.

## Scope

This design applies to:

- `bun run test:bdd`
- the scheduled and manually dispatched BDD GitHub Actions job
- `tools/load-tests/local-1000-participant-event.ts`
- shared BDD persona, session-state, fixture, and API-client helpers

It does not change:

- production or deployed test-environment authentication
- Auth0 account linking, logout, callbacks, tenant automation, or deployment
- the platform authorization model
- unit and integration fixtures that deliberately exercise Auth0-shaped
  subjects or Auth0-specific behavior

## Stable Personas

The repository defines four fixed personas in source:

| Key | Email | D1 authorization |
| --- | --- | --- |
| `platform_admin` | `platform-admin@bdd.codex-events.test` | Platform admin |
| `event_admin` | `event-admin@bdd.codex-events.test` | Event admin for fixture events |
| `judge` | `judge@bdd.codex-events.test` | Judge for fixture events |
| `regular_user` | `regular-user@bdd.codex-events.test` | No administrative role |

Each persona has a stable display name, nickname, email, and subject. The
subject uses the existing local identity form:

```text
local-chatgpt|<normalized email>
```

No persona has a password or remote identity record.

## Session Model

BDD and load-test processes write Playwright `storageState` files directly.
Each file contains the existing local-development cookie:

```text
codex-events-local-user=<persona email>
```

The cookie is HTTP-only, same-site `Lax`, scoped to the configured local test
origin, and non-secure for HTTP. The application already turns this cookie into
the same session-user shape consumed by actor resolution.

Tests never call `/auth/login`, invoke the Codex CLI, or add a second test-only
authentication endpoint, header, token format, or provider abstraction.

The local cookie carries no role or platform-user identifier. D1 lookup by the
derived subject resolves the fixture user, and existing authorization code
derives platform and event roles from database rows.

## BDD Bootstrap

The BDD bootstrap performs only local deterministic work:

1. Resolve the isolated BDD D1 state root.
2. Load the fixed personas from source.
3. Clear and migrate the BDD D1 database.
4. Seed platform, event, role, application, team, submission, and judging
   fixtures using the fixed persona subjects.
5. Recreate the four Playwright storage-state files directly.

The bootstrap does not start Nuxt or Chromium. Playwright starts Nuxt once for
the test run through its existing `webServer` configuration.

The BDD server always starts in the existing local-auth mode. Its command
ignores `.env` and clears the four required Auth0 runtime variables so an
operator's shell or local Auth0 setup cannot change BDD identity behavior.

The default origin remains `http://localhost:3100`. `BDD_BASE_URL` is the only
optional origin override. The Auth0-specific
`NUXT_AUTH0_BDD_APP_BASE_URL` setting is removed without a compatibility
fallback.

## Load Runner

The local 1,000-participant load runner uses the same fixed persona definitions
and storage-state writer. It continues to seed its larger dataset and use the
event-admin persona for authenticated API and browser probes.

The runner starts its Nuxt child process with Auth0 runtime values cleared, so
it cannot depend on `.env`, an Auth0 tenant, or Codex login state. Its existing
CLI base-URL option remains authoritative.

## Removed Auth0 Test Machinery

The following BDD-only machinery is removed:

- Auth0 Management API persona reconciliation
- persona email and password environment schemas
- Universal Login form automation and retry logic
- BDD-specific Auth0 login and callback routes
- BDD callback URLs in Auth0 bootstrap automation
- Auth0 and E2E secrets from the BDD GitHub Actions job
- conditional BDD skipping based on missing Auth0 settings
- Auth0-specific feature wording and contributor instructions

The scheduled/manual BDD job runs with no GitHub environment or authentication
secrets. Its cadence remains unchanged.

## Error Handling

Bootstrap failures are limited to local filesystem, migration, fixture, and
storage-state errors. Missing Auth0 configuration is not an error.

Persona lookup remains strict: unknown persona keys fail immediately. Storage
state is always regenerated after fixture reset, preventing a stale session
artifact from silently selecting the wrong identity.

## Validation

Automated coverage verifies:

- the fixed persona definitions and derived subjects
- storage-state cookie attributes and origin scoping
- platform fixture SQL maps each persona subject to the expected user and roles
- BDD startup ignores Auth0 and E2E environment settings
- existing authenticated API and browser scenarios pass for all four personas
- the load-runner smoke mode starts and authenticates without Auth0 settings
- Auth0 deployment and production unit/integration coverage remains green

Repository validation includes lint, typecheck, unit tests, integration tests,
the complete BDD suite, and a load-runner smoke execution.
