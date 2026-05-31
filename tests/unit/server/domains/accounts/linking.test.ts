import type { H3Event } from 'h3'

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const {
  CookieTransactionStore,
  ServerClient,
  StatefulStateStore,
  StatelessStateStore,
  completeInteractiveLogin,
  getSession,
  startInteractiveLogin,
  transactionStoreDelete,
  stateStoreDelete
} = vi.hoisted(() => {
  const startInteractiveLogin = vi.fn(async () => new URL('https://auth.example.test/authorize'))
  const completeInteractiveLogin = vi.fn(async () => undefined)
  const getSession = vi.fn(async () => ({
    user: {
      sub: 'auth0|existing-password-user'
    }
  }))
  const transactionStoreDelete = vi.fn(async () => undefined)
  const stateStoreDelete = vi.fn(async () => undefined)

  return {
    startInteractiveLogin,
    completeInteractiveLogin,
    getSession,
    transactionStoreDelete,
    stateStoreDelete,
    ServerClient: vi.fn(function ServerClient(this: Record<string, unknown>, options: Record<string, unknown>) {
      this.options = options
      this.startInteractiveLogin = startInteractiveLogin
      this.completeInteractiveLogin = completeInteractiveLogin
      this.getSession = getSession
    }),
    CookieTransactionStore: vi.fn(function CookieTransactionStore(this: Record<string, unknown>) {
      this.get = vi.fn()
      this.set = vi.fn()
      this.delete = transactionStoreDelete
    }),
    StatefulStateStore: vi.fn(function StatefulStateStore(this: Record<string, unknown>) {
      this.get = vi.fn()
      this.set = vi.fn()
      this.delete = stateStoreDelete
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
  StatefulStateStore,
  StatelessStateStore
}))

function createEvent() {
  return {
    node: {
      req: {
        url: '/auth/link/callback?code=fixture&state=fixture'
      }
    },
    context: {
      runtimeConfig: {
        auth0: {
          accountLinkChallengeSecret: 'link-secret',
          appBaseUrl: 'https://test.codex-events.com',
          audience: 'https://api.example.test',
          clientId: 'client-id',
          clientSecret: 'client-secret',
          databaseConnectionName: 'Username-Password-Authentication',
          domain: 'codex-events-test.eu.auth0.com',
          sessionConfiguration: {
            rolling: false
          },
          sessionSecret: 'session-secret'
        }
      }
    }
  } as H3Event
}

describe('platform account-link Auth0 helper', () => {
  beforeEach(() => {
    vi.resetModules()
    startInteractiveLogin.mockReset()
    startInteractiveLogin.mockResolvedValue(new URL('https://auth.example.test/authorize'))
    completeInteractiveLogin.mockReset()
    completeInteractiveLogin.mockResolvedValue(undefined)
    getSession.mockReset()
    getSession.mockResolvedValue({
      user: {
        sub: 'auth0|existing-password-user'
      }
    })
    transactionStoreDelete.mockReset()
    transactionStoreDelete.mockResolvedValue(undefined)
    stateStoreDelete.mockReset()
    stateStoreDelete.mockResolvedValue(undefined)
    ServerClient.mockClear()
    CookieTransactionStore.mockClear()
    StatefulStateStore.mockClear()
    StatelessStateStore.mockClear()
    vi.stubGlobal('useRuntimeConfig', ((event: H3Event) => event.context.runtimeConfig) as typeof useRuntimeConfig)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('uses isolated Auth0 state and transaction identifiers for the link verification flow', async () => {
    const event = createEvent()
    const linking = await import('../../../../../server/domains/accounts/linking')

    const authorizationUrl = await linking.startPlatformAccountLinkAuthentication(event, 'existing-user@example.com')

    expect(authorizationUrl.toString()).toBe('https://auth.example.test/authorize')
    expect(ServerClient).toHaveBeenCalledTimes(1)
    expect(ServerClient).toHaveBeenCalledWith(expect.objectContaining({
      authorizationParams: {
        audience: 'https://api.example.test',
        redirect_uri: 'https://test.codex-events.com/auth/link/callback'
      },
      stateIdentifier: '__a0_platform_account_link_session',
      transactionIdentifier: '__a0_platform_account_link_tx'
    }))
    expect(StatelessStateStore).toHaveBeenCalledTimes(1)
    expect(StatefulStateStore).not.toHaveBeenCalled()
    expect(startInteractiveLogin).toHaveBeenCalledWith({
      authorizationParams: {
        connection: 'Username-Password-Authentication',
        prompt: 'login',
        login_hint: 'existing-user@example.com',
        redirect_uri: 'https://test.codex-events.com/auth/link/callback'
      }
    }, {
      event
    })
  })

  test('reuses the isolated client to complete verification, read the authenticated subject, and clear link-session state', async () => {
    const event = createEvent()
    const linking = await import('../../../../../server/domains/accounts/linking')

    await linking.startPlatformAccountLinkAuthentication(event, 'existing-user@example.com')
    await linking.completePlatformAccountLinkAuthentication(event)
    const authenticatedSubject = await linking.readPlatformAccountLinkAuthenticatedSubject(event)
    await linking.clearPlatformAccountLinkAuthentication(event)

    expect(ServerClient).toHaveBeenCalledTimes(1)
    expect(completeInteractiveLogin).toHaveBeenCalledWith(
      new URL('https://test.codex-events.com/auth/link/callback?code=fixture&state=fixture'),
      { event }
    )
    expect(authenticatedSubject).toBe('auth0|existing-password-user')
    expect(getSession).toHaveBeenCalledWith({ event })
    expect(stateStoreDelete).toHaveBeenCalledWith('__a0_platform_account_link_session', { event })
    expect(transactionStoreDelete).toHaveBeenCalledWith('__a0_platform_account_link_tx', { event })
  })

  test('builds an Auth0 Action continuation form after primary-account verification', async () => {
    const event = createEvent()
    const linking = await import('../../../../../server/domains/accounts/linking')

    const responseHtml = await linking.buildPlatformAccountLinkActionContinueResponse(event, {
      primaryAuth0Subject: 'auth0|existing-password-user',
      secondaryAuth0Subject: 'google-oauth2|existing-google-user',
      email: 'existing-user@example.com',
      actionState: 'auth0-action-state',
      continueUri: 'https://codex-events-test.eu.auth0.com/continue',
      expiresAt: new Date(Date.now() + 60_000).toISOString()
    }, {
      ok: true
    })

    expect(responseHtml).toContain('method="post"')
    expect(responseHtml).toContain('action="https://codex-events-test.eu.auth0.com/continue"')
    expect(responseHtml).toContain('name="state" value="auth0-action-state"')
    expect(responseHtml).toContain('name="session_token"')
  })
})
