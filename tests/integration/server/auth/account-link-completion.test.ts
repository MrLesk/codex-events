import { createHmac } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { eq } from 'drizzle-orm'

import { userAuthIdentities, users } from '../../../../server/database/schema'
import authLinkCompleteHandler from '../../../../server/routes/auth/link/complete'
import authLinkLoginHandler from '../../../../server/routes/auth/link/login'
import { createApiRouteTestHarness } from '../../../support/backend/api-route'

const {
  CookieTransactionStore,
  ServerClient,
  StatelessStateStore,
  getSession,
  startInteractiveLogin,
  stateStoreDelete,
  transactionStoreDelete
} = vi.hoisted(() => {
  const getSession = vi.fn(async () => ({
    user: {
      sub: 'auth0|existing-password-user'
    }
  }))
  const startInteractiveLogin = vi.fn(async () => new URL('https://auth.example.test/authorize'))
  const stateStoreDelete = vi.fn(async () => undefined)
  const transactionStoreDelete = vi.fn(async () => undefined)

  return {
    getSession,
    startInteractiveLogin,
    stateStoreDelete,
    transactionStoreDelete,
    ServerClient: vi.fn(function ServerClient(this: Record<string, unknown>) {
      this.startInteractiveLogin = startInteractiveLogin
      this.getSession = getSession
    }),
    CookieTransactionStore: vi.fn(function CookieTransactionStore(this: Record<string, unknown>) {
      this.get = vi.fn()
      this.set = vi.fn()
      this.delete = transactionStoreDelete
    }),
    StatelessStateStore: vi.fn(function StatelessStateStore(this: Record<string, unknown>) {
      this.get = vi.fn()
      this.set = vi.fn()
      this.delete = stateStoreDelete
    })
  }
})

vi.mock('@auth0/auth0-server-js', () => ({
  CookieTransactionStore,
  ServerClient,
  StatelessStateStore,
  StatefulStateStore: StatelessStateStore
}))

function createActionRedirectToken() {
  const header = Buffer.from(JSON.stringify({
    alg: 'HS256',
    typ: 'JWT'
  })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    sub: 'google-oauth2|existing-google-user',
    exp: Math.floor(Date.now() / 1000) + 300,
    primary_user_id: 'auth0|existing-password-user',
    primary_email: 'existing-user@example.com',
    secondary_user_id: 'google-oauth2|existing-google-user',
    secondary_email: 'existing-user@example.com',
    continue_uri: 'https://codex-events-test.eu.auth0.com/continue'
  })).toString('base64url')
  const signature = createHmac('sha256', 'link-secret')
    .update(`${header}.${payload}`)
    .digest('base64url')

  return `${header}.${payload}.${signature}`
}

describe('Auth0 account-link completion route', () => {
  const harnesses: Array<ReturnType<typeof createApiRouteTestHarness>> = []

  beforeEach(() => {
    getSession.mockResolvedValue({
      user: {
        sub: 'auth0|existing-password-user'
      }
    })
    startInteractiveLogin.mockResolvedValue(new URL('https://auth.example.test/authorize'))
  })

  afterEach(async () => {
    vi.unstubAllGlobals()
    while (harnesses.length > 0) {
      await harnesses.pop()?.d1Database.close()
    }
  })

  test('persists both subjects through strong D1 and safely repeats completion after an interrupted Auth0 handoff', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/auth/link/login', handler: authLinkLoginHandler },
        { method: 'get', path: '/auth/link/complete', handler: authLinkCompleteHandler }
      ],
      runtimeConfig: {
        auth0: {
          appBaseUrl: 'https://test.codex-events.com',
          domain: 'codex-events-test.eu.auth0.com',
          clientId: 'client-id',
          clientSecret: 'client-secret',
          sessionSecret: 'session-secret',
          databaseConnectionName: 'Username-Password-Authentication',
          accountLinkChallengeSecret: 'link-secret'
        }
      },
      autoAcceptCurrentPlatformDocuments: false
    })
    harnesses.push(harness)

    await harness.database.insert(users).values({
      id: 'existing-platform-user',
      auth0Subject: 'auth0|existing-password-user',
      email: 'existing-user@example.com',
      displayName: 'Existing User'
    })

    const loginResponse = await harness.request(`/auth/link/login?state=auth0-action-state&session_token=${encodeURIComponent(createActionRedirectToken())}`)
    const challengeCookie = loginResponse.headers.get('set-cookie')?.split(';', 1)[0] ?? ''
    const queryOffset = harness.d1Database.queries.length

    expect(loginResponse.status).toBe(302)
    expect(challengeCookie).toContain('codex_platform_account_link=')

    const firstCompletion = await harness.request('/auth/link/complete', {
      headers: {
        cookie: challengeCookie
      }
    })
    const retryCompletion = await harness.request('/auth/link/complete', {
      headers: {
        cookie: challengeCookie
      }
    })

    expect(firstCompletion.status).toBe(200)
    expect(retryCompletion.status).toBe(200)
    await expect(firstCompletion.text()).resolves.toContain('name="session_token"')
    await expect(retryCompletion.text()).resolves.toContain('name="session_token"')

    const identities = await harness.database.query.userAuthIdentities.findMany({
      where: eq(userAuthIdentities.userId, 'existing-platform-user')
    })
    expect(identities.map(identity => identity.auth0Subject).sort()).toEqual([
      'auth0|existing-password-user',
      'google-oauth2|existing-google-user'
    ])
    expect(harness.d1Database.sessionStarts).toEqual(['first-primary', 'first-primary'])

    const completionQueries = harness.d1Database.queries.slice(queryOffset)
    expect(new Set(completionQueries.map(query => query.sessionId)).size).toBe(2)
    expect(completionQueries.filter(query => query.isWrite && query.sql.includes('user_auth_identities'))).toHaveLength(1)
    expect(completionQueries.filter(query => query.sql.includes('user_auth_identities') && query.sql.includes('inner join'))).toHaveLength(2)
    expect(getSession).toHaveBeenCalledTimes(2)
    expect(stateStoreDelete).toHaveBeenCalledTimes(2)
    expect(transactionStoreDelete).toHaveBeenCalledTimes(2)
  })
})
