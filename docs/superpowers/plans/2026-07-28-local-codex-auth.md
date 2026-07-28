# Local Codex Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let contributors sign in to and out of local Codex Events through their installed Codex CLI when Auth0 is not configured.

**Architecture:** Nuxt configuration enables a development-only local mode when any required Auth0 variable is missing and supplies inert Auth0 defaults so the existing module can start. An app-owned login route runs `codex login`, reads the account email through app-server, and stores that email in an HTTP-only local cookie; request middleware presents the cookie as the existing Auth0-shaped session. Logout clears only the Codex Events cookie.

**Tech Stack:** Nuxt 4, H3 cookies and routes, Codex CLI app-server JSON-RPC, Vitest.

## Global Constraints

- Local authentication is available only in Nuxt development mode when required Auth0 settings are absent.
- Production authentication behavior remains on Auth0.
- The local identity subject is `local-chatgpt|<normalized email>`.
- The application never reads, persists, logs, or returns OpenAI credential material.
- Local logout never invokes `codex logout`.
- Do not add a provider abstraction, database migration, account-linking behavior, or new UI.

---

### Task 1: Select local authentication and expose its session through the existing seam

**Files:**
- Create: `tools/local-auth/mode.ts`
- Create: `server/auth/local-codex-auth.ts`
- Create: `server/middleware/auth0-local-session.ts`
- Modify: `nuxt.config.ts`
- Test: `tests/unit/tools/local-auth/mode.test.ts`
- Test: `tests/unit/server/auth/local-codex-auth.test.ts`

**Interfaces:**
- Produces: `shouldUseLocalCodexAuth(isDevelopment, environment): boolean`
- Produces: `readLocalCodexUser(event): LocalCodexUser | null`
- Produces: `setLocalCodexUser(event, email): LocalCodexUser`
- Produces: `clearLocalCodexUser(event): void`
- Produces: request-scoped `event.context.auth0Client.getUser()` and `.getSession()` behavior in local mode.

- [ ] **Step 1: Write failing mode-selection tests**

```ts
test('uses local Codex auth only in development when Auth0 is incomplete', () => {
  expect(shouldUseLocalCodexAuth(true, {})).toBe(true)
  expect(shouldUseLocalCodexAuth(false, {})).toBe(false)
  expect(shouldUseLocalCodexAuth(true, completeAuth0Environment)).toBe(false)
})
```

- [ ] **Step 2: Run the mode test and verify it fails**

Run: `bunx vitest run tests/unit/tools/local-auth/mode.test.ts`

Expected: FAIL because `tools/local-auth/mode.ts` does not exist.

- [ ] **Step 3: Implement exact Auth0 completeness detection**

```ts
const requiredAuth0Variables = [
  'NUXT_AUTH0_DOMAIN',
  'NUXT_AUTH0_CLIENT_ID',
  'NUXT_AUTH0_CLIENT_SECRET',
  'NUXT_AUTH0_SESSION_SECRET'
] as const

export function shouldUseLocalCodexAuth(
  isDevelopment: boolean,
  environment: NodeJS.ProcessEnv
) {
  return isDevelopment
    && requiredAuth0Variables.some(name => !environment[name]?.trim())
}
```

- [ ] **Step 4: Configure Nuxt without weakening production**

Use `shouldUseLocalCodexAuth(process.env.NODE_ENV !== 'production', process.env)`
in `nuxt.config.ts`. Add private `runtimeConfig.localCodexAuth` and, only when it
is true, give the Auth0 module inert non-empty defaults for domain, client ID,
client secret, and session secret. Move the SDK login handler to
`/auth/sdk/login`; keep the existing `/auth/callback` and `/auth/sdk/logout`
configuration.

- [ ] **Step 5: Write failing cookie-session tests**

Test that `setLocalCodexUser()` normalizes the email, writes an HTTP-only
same-site cookie, and returns:

```ts
{
  sub: 'local-chatgpt|developer@example.com',
  email: 'developer@example.com',
  email_verified: true,
  name: null,
  nickname: null,
  picture: null
}
```

Also test that `readLocalCodexUser()` returns `null` without a cookie and that
`clearLocalCodexUser()` removes the cookie.

- [ ] **Step 6: Run the cookie-session tests and verify they fail**

Run: `bunx vitest run tests/unit/server/auth/local-codex-auth.test.ts`

Expected: FAIL because the local session functions do not exist.

- [ ] **Step 7: Implement the minimal local cookie**

Use one development cookie named `codex-events-local-user`. Store only the
normalized email and set:

```ts
{
  httpOnly: true,
  sameSite: 'lax',
  secure: false,
  path: '/'
}
```

Do not add signing, refresh, persistence, or account-switching machinery.

- [ ] **Step 8: Present the cookie through the Auth0 request seam**

In `server/middleware/auth0-local-session.ts`, return immediately unless
`runtimeConfig.localCodexAuth` is true. Nuxt configuration computes that flag as
development-only. Otherwise assign a minimal request client:

```ts
const user = readLocalCodexUser(event)

event.context.auth0Client = {
  getUser: async () => user ?? undefined,
  getSession: async () => user ? { user } : null
} as never
```

The filename keeps this middleware after `auth0-context.ts` and before
`dashboard-auth.ts`. Existing server actor resolution and the Auth0 Nuxt SSR
middleware then consume the local session without call-site changes.

- [ ] **Step 9: Run focused tests**

Run:

```bash
bunx vitest run tests/unit/tools/local-auth/mode.test.ts
bunx vitest run tests/unit/server/auth/local-codex-auth.test.ts
```

Expected: PASS.

---

### Task 2: Implement local sign-in and sign-out

**Files:**
- Modify: `server/auth/local-codex-auth.ts`
- Create: `server/routes/auth/login.ts`
- Modify: `server/routes/auth/logout.ts`
- Test: `tests/unit/server/routes/auth/local-codex-auth.test.ts`
- Test: `tests/unit/server/routes/auth/logout.test.ts`

**Interfaces:**
- Consumes: local mode flag and cookie helpers from Task 1.
- Produces: `authenticateWithCodex(): Promise<LocalCodexUser>`.
- Produces: `/auth/login` that selects local Codex or Auth0.
- Produces: `/auth/logout` that selects local cookie clearing or Auth0 logout.

- [ ] **Step 1: Write failing local login route tests**

Cover:

```ts
test('local login authenticates with Codex, sets the local session, and returns safely')
test('local login returns an actionable error when Codex is unavailable')
test('configured Auth0 still starts the existing interactive login')
```

The success test stubs `authenticateWithCodex()` and requests
`/auth/login?returnTo=%2Faccount`. The production test expects
`useAuth0(event).startInteractiveLogin({ appState: { returnTo } })`.

- [ ] **Step 2: Run the login route test and verify it fails**

Run: `bunx vitest run tests/unit/server/routes/auth/local-codex-auth.test.ts`

Expected: FAIL because `server/routes/auth/login.ts` does not exist.

- [ ] **Step 3: Run Codex login without a shell**

Inside `authenticateWithCodex()`, dynamically import `node:child_process`, use
`spawn('codex', ['login'])`, ignore stdin, and wait for exit. Map `ENOENT` to:

```text
Codex CLI is required for local sign-in. Install Codex and try again.
```

Map a non-zero exit to:

```text
Codex sign-in was cancelled or failed. Try again.
```

Never include stdout, stderr, environment values, or command details in the
HTTP error.

- [ ] **Step 4: Read only account metadata from app-server**

After login succeeds, spawn `codex app-server --stdio`. Send:

```json
{"id":1,"method":"initialize","params":{"clientInfo":{"name":"codex-events","title":"Codex Events","version":"1"}}}
{"method":"initialized","params":{}}
{"id":2,"method":"account/read","params":{"refreshToken":false}}
```

Parse newline-delimited JSON, accept only response `id: 2`, require
`account.type === "chatgpt"` and a non-empty `account.email`, then terminate the
child process. Add a ten-second timeout and convert protocol/process failures to:

```text
Codex Events could not read your ChatGPT account. Run `codex login` and try again.
```

- [ ] **Step 5: Implement the app-owned login route**

Normalize `returnTo` with `normalizeAuthReturnTo()`. In local mode, call
`authenticateWithCodex()`, set the cookie, and redirect to `returnTo`. Otherwise
preserve the existing Auth0 behavior:

```ts
const authorizationUrl = await useAuth0(event).startInteractiveLogin({
  appState: {
    returnTo: new URL(returnTo, runtimeConfig.auth0.appBaseUrl).toString()
  }
})

return sendRedirect(event, authorizationUrl.href)
```

- [ ] **Step 6: Write the failing local logout test**

Extend `tests/unit/server/routes/auth/logout.test.ts` with a local-mode case that
asserts the cookie is deleted, the response redirects to the configured app base
URL, and `useAuth0()` is not called.

- [ ] **Step 7: Implement local logout before the existing Auth0 branch**

```ts
if (runtimeConfig.localCodexAuth) {
  clearLocalCodexUser(event)
  return sendRedirect(event, runtimeConfig.auth0.appBaseUrl)
}
```

Leave the current Auth0 logout branch unchanged and never invoke `codex logout`.

- [ ] **Step 8: Run focused route tests**

Run:

```bash
bunx vitest run tests/unit/server/routes/auth/local-codex-auth.test.ts
bunx vitest run tests/unit/server/routes/auth/logout.test.ts
```

Expected: PASS.

---

### Task 3: Document and validate the zero-configuration local workflow

**Files:**
- Modify: `DEVELOPMENT.md`
- Modify through CLI: `.backlog/tasks/task-421 - Authenticate-local-development-through-Codex-app-server.md`

**Interfaces:**
- Consumes: the completed local login/logout behavior.
- Produces: contributor instructions and verified task evidence.

- [ ] **Step 1: Update contributor setup**

At the start of `DEVELOPMENT.md`, document:

```text
For ordinary local development, install Codex, run `bun run dev`, and use the
application's Sign in control. When the required Auth0 variables are absent,
Codex Events opens the Codex login flow and creates a local session from the
ChatGPT email returned by Codex app-server. Sign out clears only Codex Events.
```

Keep the existing Auth0 variables as the opt-in setup for Auth0-backed local
development and BDD.

- [ ] **Step 2: Run the required repository validation**

Run:

```bash
bun run lint
bun run typecheck
bun run test:unit
bun run test:integration
git diff --check
```

Run `bun run test:bdd` only when its documented real Auth0 credentials are
available; otherwise record that the unchanged Auth0-backed suite could not run.

- [ ] **Step 3: Manually smoke-test local sign-in**

With the four required Auth0 variables unset:

```bash
bun run dev
```

Verify the app starts, Sign in invokes Codex, successful completion returns to
Codex Events as the reported email, and Sign out returns to the anonymous state
without changing `codex login status`.

- [ ] **Step 4: Finalize TASK-421**

Use Backlog CLI to record modified files, validation evidence, the deliberate
email-identity limitation, and the BDD result. Check acceptance criteria and
Definition of Done only when supported by the recorded evidence.

- [ ] **Step 5: Commit and push only task files**

Inspect `git status`, stage only the implementation, tests, documentation,
design/plan, and TASK-421 metadata, then commit directly to `main` and push
`origin/main`. Do not stage the pre-existing `AGENTS.md`, `.backlog/archive/`,
`groma.config.json`, or `groma/` changes.
