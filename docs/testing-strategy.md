# Testing Strategy

This document defines the canonical testing strategy for the Codex hackathon platform.

## Testing Layers

The platform uses three testing layers:

- `Vitest` for unit tests and integration tests of isolated application logic
- `Playwright` with `playwright-bdd` for end-to-end tests authored as BDD scenarios that exercise the real web application
- fixture bootstrap scripts for deterministic Auth0 and platform-database test state

In this repository, end-to-end coverage is authored as Gherkin feature files plus step definitions through `playwright-bdd`. This includes the authenticated backend workflow coverage that reuses real Auth0-backed browser session state.
Repository-authored end-to-end scenarios and their local bootstrap support live under `tests/bdd/`. Feature files live under `tests/bdd/features`, matching step definitions live under `tests/bdd/steps`, and authenticated bootstrap helpers live under `tests/bdd/bootstrap.ts` and `tests/bdd/support`.
The default local BDD test command runs both signed-out and authenticated scenarios.

## Backend Release Gate

The API-first backend program is the release gate before UI implementation begins.

The required validation surface is:

- `bun run lint`
- `bun run typecheck`
- `bun run test:unit`
- `bun run test:integration`
- `bun run test:bdd`

For local full-gate execution, the repository also exposes:

- `bun run validate:backend`

Continuous integration must run the same validation surface with the Auth0-backed BDD environment configured through repository secrets.

## Milestone 1 UI Validation Surface

Milestone 1 UI work adds a narrower frontend validation scope on top of the backend release gate.

The required local UI validation surface is:

- `bun run test:unit:ui-milestone`
- `bun run test:bdd:ui-milestone`
- `bun run validate:ui-milestone`

This UI validation surface is intentionally role-aware and maps directly to the canonical Milestone 1 product areas:

| UI Area | Coverage Expectation | Current Automated Coverage |
| --- | --- | --- |
| Public entry | Signed-out homepage and public discovery remain covered as public browser flows. | `tests/bdd/features/public/public-homepage.feature`, `tests/bdd/features/public/hackathon-discovery.feature` |
| Participant account and application | Platform-account recovery, participant application, team formation, and team submission remain covered through Auth0-backed browser flows. | `tests/bdd/features/authenticated-destructive/account-management.feature`, `tests/bdd/features/authenticated/participant-application.feature`, `tests/bdd/features/authenticated/team-workspace.feature`, `tests/bdd/features/authenticated/team-submission.feature` |
| Judge workspace | Blind judge workflow remains covered through the dedicated judge workspace feature. | `tests/bdd/features/authenticated/judge-workspace.feature` |
| Admin workspace | Admin operations and competition oversight remain covered through dedicated admin browser flows. | `tests/bdd/features/authenticated/admin-operations.feature`, `tests/bdd/features/authenticated/admin-competition.feature` |
| Prize-recipient workspace | Winner-facing prize redemption remains covered through the dedicated redemption feature. | `tests/bdd/features/authenticated/prize-redemptions.feature` |
| UI helper logic | Frontend helper and fixture logic remains covered by task-scoped Vitest suites under `tests/unit/app` plus `tests/unit/support/bdd/platform-fixtures.test.ts`. | `bun run test:unit:ui-milestone` |

Milestone 1 UI validation reuses the same stable Auth0 personas, cookie-backed browser sessions, and deterministic fixture reset flow as the broader repository BDD suite. It does not introduce fake identity shortcuts, alternate authorization fixtures, or a parallel test harness.

The UI milestone validation surface is intentionally narrower than the backend release gate:

- it targets the public, participant, judge, admin, and prize-recipient browser flows introduced by Milestone 1
- it does not replace the broader backend workflow coverage under `TASK-3.*`
- it keeps destructive account-deletion coverage in the full backend BDD suite instead of the faster UI milestone alias

When backend constraints prevent complete actor-facing UI coverage, the gap must be documented explicitly in the owning task summary rather than implied away. Current known limitations are:

- the focused UI milestone alias does not include the dedicated account-deletion feature because that remains part of the broader destructive backend release gate
- cross-cutting shell states that are only exercised incidentally by role-specific routes do not yet have a dedicated standalone Milestone 1 browser feature

## Core Rules

- End-to-end tests use real Auth0 authentication.
- End-to-end tests do not bypass login with fake tokens, mock identity payloads, or test-only authorization shortcuts.
- Auth0 remains responsible for identity.
- The platform database remains responsible for authorization.
- Platform roles such as platform admin, hackathon admin, and judge are never modeled as Auth0 roles for application behavior.

## Auth0 Test Tenant

The platform uses a dedicated Auth0 test tenant for end-to-end testing.

The test tenant contains:

- a dedicated Regular Web Application for the Nuxt app
- a dedicated database connection for end-to-end test users
- a dedicated machine-to-machine application for Management API access

Auth0 Management API access is used only to provision and reset Auth0-side test fixtures. It is not used to bypass real user authentication during test execution.

## Stable E2E Personas

The platform maintains four stable Auth0 personas for role-based end-to-end coverage:

- `platform_admin`
- `hackathon_admin`
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
- `HackathonRoleAssignment` rows for hackathon-admin and judge personas
- any required `UserApplication`, team, submission, or hackathon fixtures needed by the scenario under test

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

For local repository execution, platform fixture reset uses the local SQLite-backed D1 path rather than a remote Cloudflare D1 API path.

Reset logic must:

- preserve the stable persona identities
- reconcile passwords and profile state for those personas when needed
- recreate or normalize platform authorization rows and scenario data before test execution
- avoid coupling one test's authorization state to another test's leftovers

For local authenticated validation, the repository prefers a SQLite-backed local D1 file instead of remote Cloudflare D1 fixture reset. The local bootstrap lifecycle is explicit: delete the previous SQLite file, recreate it from migrations, seed the canonical fixture dataset, clear saved session-state artifacts, and then perform fresh real Auth0 logins.

## Unsupported Patterns

The following are not part of the supported testing strategy:

- bypass headers that impersonate users without Auth0
- hard-coded JWTs that do not come from the test tenant
- moving platform authorization logic into Auth0 for test convenience
- role assertions that depend on Auth0 roles instead of platform-database state
