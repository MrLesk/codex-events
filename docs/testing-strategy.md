# Testing Strategy

This document defines the canonical testing strategy for the Codex event
platform.

## Testing Layers

The platform uses three testing layers:

- `Vitest` unit tests for isolated application and domain behavior
- `Vitest` integration tests for boundaries that need multiple server modules
  or infrastructure-shaped fixtures
- `Playwright` with `playwright-bdd` for browser and API end-to-end scenarios
  against the real local Nuxt application and Cloudflare D1 runtime

BDD scenarios are authored as Gherkin feature files under
`tests/bdd/features`. Their step definitions and bootstrap support live under
`tests/bdd/steps`, `tests/bdd/bootstrap.ts`, and `tests/bdd/support`.
Generated Playwright files under `.features-gen/` are not edited by hand.

## Validation Surfaces

### Fast CI Gate

Every push and pull request runs:

- `bun run lint`
- `bun run typecheck`
- `bun run test:unit`
- `bun run test:integration`

Public signed integration behavior, including inbound Luma attendance sync, is
covered by the unit and integration layers.

### Full BDD Gate

The complete browser and API suite runs with:

```bash
bun run test:bdd
```

GitHub Actions exposes this gate through manual `workflow_dispatch` runs and a
nightly schedule at `03:00 UTC`. It needs no GitHub environment, Auth0 tenant,
persona credentials, or authentication secrets.

The repository also exposes all test layers together:

```bash
bun run test:all
```

## Local Test Personas

BDD and the local load runner use four stable personas defined in source:

| Persona | Email | D1 authorization |
| --- | --- | --- |
| `platform_admin` | `platform-admin@bdd.codex-events.test` | Platform admin |
| `event_admin` | `event-admin@bdd.codex-events.test` | Event admin for fixture events |
| `judge` | `judge@bdd.codex-events.test` | Judge for fixture events |
| `regular_user` | `regular-user@bdd.codex-events.test` | No administrative role |

Each identity subject has the form:

```text
local-chatgpt|<normalized email>
```

The identity cookie does not contain a role or platform-user ID. Fixture rows in
D1 map the subject to a user and provide all platform and event authorization.
Tests must not encode platform roles in cookies, headers, tokens, or persona
definitions.

The BDD harness writes Playwright `storageState` files directly with the
existing local-development cookie:

```text
codex-events-local-user=<persona email>
```

The application resolves that cookie through the normal local session
middleware and then uses the same actor and authorization paths as ordinary
requests. Browser and API scenarios reuse the generated storage state.

BDD never opens Auth0 Universal Login, invokes the Codex CLI, or calls an
external identity service.

## Production Authentication Boundary

Auth0 remains the production authentication and identity provider. Application
authorization remains in the platform database.

The local persona mechanism is enabled only because the BDD and load-test Nuxt
processes run in development with the required Auth0 runtime values cleared.
Production startup does not enable local authentication.

Auth0-specific behavior such as runtime configuration, callback handling,
logout, account linking, management automation, and email verification is
covered by focused unit and integration tests. The local persona suite does not
claim to test Auth0-hosted pages or tenant behavior.

## Fixture Bootstrap

BDD bootstrap is deterministic local work:

1. Resolve the dedicated BDD D1 persistence root.
2. Clear the selected state.
3. Apply migrations.
4. Seed users, roles, events, applications, teams, submissions, judging, and
   outcome fixtures.
5. Recreate storage-state files for all four personas.

Local app development defaults to `.wrangler/state`. BDD defaults to
`.wrangler/state-bdd` and accepts `LOCAL_BDD_D1_STATE_ROOT` as its persistence
override. The guard rejects the normal local-development root for destructive
BDD reset work.

The BDD origin defaults to `http://localhost:3100`. `BDD_BASE_URL` is the only
supported origin override.

Fixture reset must:

- preserve stable persona keys and subjects
- recreate authorization and scenario rows before execution
- keep destructive scenarios isolated from the rest of the suite
- prevent one run from depending on state left by another

## Browser and API End-to-End Tests

Browser scenarios apply a persona's saved cookies to a Playwright context and
exercise the visible application.

API scenarios create a Playwright request context from the same storage state.
They do not mint alternate test tokens or bypass actor resolution.

Role-specific coverage includes:

| Product area | Primary coverage |
| --- | --- |
| Public entry and discovery | Signed-out homepage and public event flows |
| Participant account and application | Registration, applications, teams, and submissions |
| Judge workspace | Assigned blind-review workflow |
| Admin workspace | Event configuration, operations, judging oversight, and outcomes |
| Prize-recipient workspace | Prize redemption |
| Destructive account behavior | Account deletion and registration recovery |

## Local Load Runner

`tools/load-tests/local-1000-participant-event.ts` uses the same four persona
definitions and storage-state writer. Its D1 seed gives the event-admin persona
the permissions needed for API and browser probes.

The runner starts Nuxt in local-auth mode with `.env` ignored and Auth0 runtime
values cleared. It must not provision Auth0 users or depend on Codex login
state.

## Core Product Rules

- Platform roles such as platform admin, event organizer, event admin, staff,
  and judge are never modeled as identity-provider roles.
- Event-type behavior is tested through `/events` and `/api/events`.
- Hackathon-only workflows are tested only against `eventType = hackathon`.
- Meetup and Build workflows are registration-focused and reject team,
  project-submission, judging, prize, and winner operations while allowing
  event-credit operations. Meetup coverage also verifies that private talk
  proposals are available only when explicitly enabled and never appear as
  public speaker or agenda content.
- Meetup Call for talks coverage includes Meetup-only configuration and
  independent-window validation; one proposal per event/user; HTTP(S) link
  validation; submitted/approved applicant eligibility; draft, submit,
  withdraw, revise, resubmit, accept, and reject transitions; owner mutation
  pauses after application rejection or withdrawal; retained owner/reviewer
  visibility; staff read-only and admin-only decisions; close/completion
  guards; unresolved completion; concurrent decision compare-and-swap; durable
  enqueue recovery; expiring delivery claims; at-least-once duplicate delivery
  and crash-retry states; conditional create-versus-disable races;
  public upcoming/open callout visibility; and account deletion.
- Simplified Meetup claiming coverage includes bounded and appendable reward
  and attendee imports, normalized-email and duplicate handling, PII
  minimization, offer visibility, configuration locking, authenticated email
  matching, idempotent coupon allocation, receipt delivery, attendance-source
  precedence, certificate eligibility, rate limiting, and the external coupon
  redirect.

## MCP Validation

MCP coverage uses the same local D1 actors and product fixtures as REST. Tests
create manual credentials through session-authenticated APIs and mint test-only
OAuth JWTs from an isolated signing key. Plaintext manual credentials, OAuth
access tokens, refresh tokens, and authorization codes never appear in fixture
source, snapshots, logs, or audit metadata.

- Unit tests cover credential generation/hash verification, fixed expiry,
  active-token cap, revocation, last-use coalescing, registry uniqueness,
  annotations, capability filtering, and error sanitization.
- Integration tests cover token APIs and account deletion, protocol
  initialize/list/call, protected-resource discovery, OAuth issuer/signature/
  expiry/audience/identity-scope validation, invalid/expired/revoked manual
  credentials and deleted-owner failures, OAuth subject mapping, current role and consent
  changes, host/origin checks, rate limiting, mutation audits, and
  representative REST/MCP parity across both authentication methods.
- Auth0 configuration tests cover Dynamic Client Registration, trusted Client
  ID Metadata Document URL validation and idempotent import, domain-level
  connection access, the default third-party user grant for the `mcp`
  permission, and absence of post-login custom-scope injection.
- Completeness tests fail for missing or duplicate eligible REST/tool mappings
  and for advertised excluded operations, including binary, token-management,
  account-deletion, public-mutation, webhook, and system routes.
- BDD covers the OAuth-first settings presentation, focused
  create/copy/done/revoke manual-token behavior, and representative
  participant, event-admin, and platform-admin calls.
- Test-environment smoke uses MCP Inspector as the protocol baseline and covers
  protected-resource and authorization-server discovery, DCR, Authorization
  Code with PKCE, token issuance for the exact MCP audience, `tools/list`, and
  a representative `tools/call`. Separate ChatGPT and Codex checks use their
  own client identities and redirect contracts. A short-lived manual credential
  confirms the secondary authentication path. Smoke evidence records only tool
  names and objective outcomes.

The Cloudflare build is part of the MCP validation gate.

## Unsupported Patterns

The following are not part of the supported testing strategy:

- Live Auth0 or Codex login automation in the deterministic local BDD suite
- test-only authentication endpoints
- bypass headers that impersonate users
- hard-coded JWTs or alternate application tokens
- identity cookies that contain application roles
- authorization assertions that depend on Auth0 roles
- remote identity or database dependencies in local BDD bootstrap
