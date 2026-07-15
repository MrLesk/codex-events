# Testing Strategy

This document defines the canonical testing strategy for the Codex event platform.

## Testing Layers

The platform uses three testing layers:

- `Vitest` for unit tests and integration tests of isolated application logic
- `Playwright` with `playwright-bdd` for end-to-end tests authored as BDD scenarios that exercise the real web application
- fixture bootstrap scripts for deterministic Auth0 and platform-database test state

In this repository, end-to-end coverage is authored as Gherkin feature files plus step definitions through `playwright-bdd`. This includes the authenticated backend workflow coverage that reuses real Auth0-backed browser session state.
Repository-authored end-to-end scenarios and their local bootstrap support live under `tests/bdd/`. Feature files live under `tests/bdd/features`, matching step definitions live under `tests/bdd/steps`, and authenticated bootstrap helpers live under `tests/bdd/bootstrap.ts` and `tests/bdd/support`.
The default local BDD test command runs both signed-out and authenticated scenarios.

## Validation Surfaces

The repository uses two automated validation surfaces: a fast CI gate for every commit and a full Auth0-backed BDD gate for explicit or periodic end-to-end coverage.

### Fast CI Gate

The fast CI gate is the default validation surface for `push` and `pull_request` runs in GitHub Actions.

Public signed integration webhook behavior, including inbound Luma attendance sync, is covered in the same fast CI gate through repository unit and integration tests rather than a separate test surface.

The required validation surface is:

- `bun run lint`
- `bun run typecheck`
- `bun run test:unit`
- `bun run test:integration`

### Full Auth0-Backed BDD Gate

The full Auth0-backed gate adds the browser and API BDD suite on top of the fast CI gate.

The required additional validation surface is:

- `bun run test:bdd`

GitHub Actions exposes this full gate through `workflow_dispatch` for on-demand runs and through a nightly scheduled run. The scheduled run executes daily at `03:00 UTC`.

For local all-test execution, the repository also exposes:

- `bun run test:all`

## Milestone 1 UI Validation Surface

Milestone 1 UI work is validated inside the broader unit and BDD test surfaces rather than through separate package-script aliases.

This UI validation surface is intentionally role-aware and maps directly to the canonical Milestone 1 product areas:

| UI Area | Coverage Expectation | Current Automated Coverage |
| --- | --- | --- |
| Public entry | Signed-out homepage and public discovery remain covered as public browser flows. | `tests/bdd/features/public/public-homepage.feature`, `tests/bdd/features/public/event-discovery.feature` |
| Participant account and application | The Auth0-backed auth entry, callback provisioning, participant application, team formation, and team submission remain covered through browser flows. | `tests/bdd/features/authenticated-destructive/account-management.feature`, `tests/bdd/features/authenticated/participant-application.feature`, `tests/bdd/features/authenticated/team-workspace.feature`, `tests/bdd/features/authenticated/team-submission.feature` |
| Judge workspace | Blind judge workflow remains covered through the dedicated judge workspace feature. | `tests/bdd/features/authenticated/judge-workspace.feature` |
| Admin workspace | Admin operations and outcome oversight remain covered through dedicated admin browser flows. | `tests/bdd/features/authenticated/admin-operations.feature`, `tests/bdd/features/authenticated/admin-competition.feature` |
| Prize-recipient workspace | Winner-facing prize redemption remains covered through the dedicated redemption feature. | `tests/bdd/features/authenticated/prize-redemptions.feature` |
| UI helper logic | Frontend helper and fixture logic remains covered by the unit-test surface under `tests/unit/app` plus `tests/unit/support/bdd/platform-fixtures.test.ts`. | `bun run test:unit` |

Milestone 1 UI validation reuses the same stable Auth0 personas, cookie-backed browser sessions, and deterministic fixture reset flow as the broader repository BDD suite. It does not introduce fake identity shortcuts, alternate authorization fixtures, or a parallel test harness.

Within the full Auth0-backed BDD gate, the UI coverage remains intentionally scoped to the canonical actor-facing surfaces:

- it targets the public, participant, staff, judge, admin, and prize-recipient browser flows introduced by Milestone 1
- it does not replace the broader backend workflow coverage under `TASK-3.*`
- it keeps destructive account-deletion coverage in the full `bun run test:bdd` suite

When backend constraints prevent complete actor-facing UI coverage, the gap must be documented explicitly in the owning task summary rather than implied away. Current known limitations are:

- cross-cutting shell states that are only exercised incidentally by role-specific routes do not yet have a dedicated standalone Milestone 1 browser feature
- staff-specific internal visibility flows do not yet have a dedicated standalone browser feature and currently rely on broader unit and integration coverage

## Core Rules

- End-to-end tests use real Auth0 authentication.
- End-to-end tests do not bypass login with fake tokens, mock identity payloads, or test-only authorization shortcuts.
- Auth0 remains responsible for identity.
- The platform database remains responsible for authorization.
- Platform roles such as platform admin, event organizer, event admin, staff, and judge are never modeled as Auth0 roles for application behavior.
- Event-type behavior is tested as product behavior, not as legacy compatibility. Tests should use `/events` and `/api/events` routes only.
- Hackathon-only workflows are tested only against `eventType = hackathon`.
- Meetup and Build workflows are tested as registration-only events and must reject team, submission, judging, prize, and winner operations while allowing event-credit operations.
- Simplified Meetup claiming coverage includes bounded and appendable private reward and approved-attendee CSV imports, duplicate reward and normalized-email handling, PII minimization, simplified-only offer visibility and configuration locking rules, authenticated email matching, idempotent and concurrent coupon allocation, one-time coupon receipt delivery, attendance-source precedence, certificate eligibility, rate limiting, and the external coupon redirect.

## Event Type Coverage

The fast CI gate includes coverage for the event platform model:

- migration tests prove existing Hackathon data is moved into `events` with `event_type = 'hackathon'`
- migration tests prove scoped role assignments move from `hackathon_admin` to `event_admin`
- API tests cover `POST /api/events` for Hackathon, Meetup, and Build creation
- authorization tests cover platform admins, event organizers, scoped event admins, staff, judges, and regular users under the event model
- UI/domain unit tests cover registration-only lifecycle controls and hidden competition tabs for Meetup and Build events

## Auth0 Test Tenant

The platform uses a dedicated Auth0 test tenant for end-to-end testing.

The test tenant contains:

- a dedicated Regular Web Application for the Nuxt app
- a dedicated database connection for end-to-end test users
- a dedicated machine-to-machine application for Management API access

Auth0 Management API access is used only to provision and reset Auth0-side test fixtures. It is not used to bypass real user authentication during test execution.

## Stable E2E Personas

The platform maintains six stable Auth0 personas for role-based end-to-end coverage:

- `platform_admin`
- `event_organizer`
- `event_admin`
- `staff`
- `judge`
- `regular_user`

Each persona has:

- a fixed email address in the Auth0 test tenant
- a durable password managed in test secrets
- a stable Auth0 identity that can be mapped into platform records

These personas are long-lived fixtures. Test runs reuse them instead of creating new browser-login identities for every suite.

## Authorization Data

Auth0 authentication alone is not sufficient to exercise platform behavior.

End-to-end test bootstrap must also seed the platform database with:

- a `User` record for each Auth0 persona
- `is_platform_admin = true` for the platform-admin persona
- `is_event_organizer = true` for the event-organizer persona
- `EventRoleAssignment` rows for event-admin, staff, and judge personas
- any required `UserApplication`, team, submission, or event fixtures needed by the scenario under test

The mapping between Auth0 identity and platform user is based on the Auth0 subject stored on the platform user record.

## Browser End-to-End Tests

Browser end-to-end tests use Playwright and authenticate through the real Auth0 Universal Login flow.

The supported flow is:

1. Ensure Auth0 personas exist in the test tenant.
2. Ensure platform-database fixtures exist for the target scenario.
3. Log each persona in through the browser against the real Auth0 login route.
4. Save Playwright `storageState` for each persona.
5. Run browser tests using the saved authenticated session state.

This keeps authentication realistic while avoiding repeated interactive login during every individual test case.

## API End-to-End Tests

API-oriented end-to-end assertions in this repository are also authored through BDD scenarios and use the same authenticated user sessions as browser tests.

The supported pattern is:

- authenticate each persona through Playwright using the real Auth0 login flow
- initialize API request clients from the authenticated browser session state
- call application APIs as that persona without minting fake application tokens

This keeps API end-to-end coverage aligned with the same cookie-based session model used by the Nuxt application.

## Fixture Reset Discipline

Auth0-side fixtures and platform-database fixtures are both reset idempotently.

For local repository execution, platform fixture reset uses a local Cloudflare D1 binding through Wrangler and Miniflare rather than a direct SQLite shim or a remote Cloudflare D1 API path.

Reset logic must:

- preserve the stable persona identities
- reconcile passwords and profile state for those personas when needed
- recreate or normalize platform authorization rows and scenario data before test execution
- avoid coupling one test's authorization state to another test's leftovers

For local authenticated validation, the repository uses the D1 binding declared in `wrangler.jsonc` and treats the local app and local BDD databases as separate persistence roots. Local app development defaults to `.wrangler/state`, authenticated BDD defaults to `.wrangler/state-bdd`, and BDD overrides must use `LOCAL_BDD_D1_STATE_ROOT`. The Auth0-backed BDD app origin also stays separate by default: local development uses `http://localhost:3000`, while the BDD harness defaults to `http://localhost:3100` unless `NUXT_AUTH0_BDD_APP_BASE_URL` is set explicitly. The BDD harness fails fast if its resolved state root matches the normal local app root. The local bootstrap lifecycle is explicit: clear the selected persisted local D1 state, recreate it from migrations, seed the canonical fixture dataset, clear saved session-state artifacts, and then perform fresh real Auth0 logins.

## Unsupported Patterns

The following are not part of the supported testing strategy:

- bypass headers that impersonate users without Auth0
- hard-coded JWTs that do not come from the test tenant
- moving platform authorization logic into Auth0 for test convenience
- role assertions that depend on Auth0 roles instead of platform-database state
