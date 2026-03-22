# Testing Strategy

This document defines the canonical testing strategy for the Codex hackathon platform.

## Testing Layers

The platform uses three testing layers:

- `Vitest` for unit tests and integration tests of isolated application logic
- `Playwright` for end-to-end tests that exercise the real web application
- fixture bootstrap scripts for deterministic Auth0 and platform-database test state

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

API end-to-end tests use the same authenticated user sessions as browser tests.

The supported pattern is:

- authenticate each persona through Playwright using the real Auth0 login flow
- initialize API request clients from the authenticated browser session state
- call application APIs as that persona without minting fake application tokens

This keeps API end-to-end coverage aligned with the same cookie-based session model used by the Nuxt application.

## Fixture Reset Discipline

Auth0-side fixtures and platform-database fixtures are both reset idempotently.

Reset logic must:

- preserve the stable persona identities
- reconcile passwords and profile state for those personas when needed
- recreate or normalize platform authorization rows and scenario data before test execution
- avoid coupling one test's authorization state to another test's leftovers

## Unsupported Patterns

The following are not part of the supported testing strategy:

- bypass headers that impersonate users without Auth0
- hard-coded JWTs that do not come from the test tenant
- moving platform authorization logic into Auth0 for test convenience
- role assertions that depend on Auth0 roles instead of platform-database state
