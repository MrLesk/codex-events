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
          appBaseUrl: 'https://dev.codex-events.com',
          audience: 'https://api.example.test',
          clientId: 'client-id',
          clientSecret: 'client-secret',
          databaseConnectionName: 'Username-Password-Authentication',
          domain: 'codex-events-dev.eu.auth0.com',
          managementAudience: 'https://codex-events-dev.eu.auth0.com/api/v2/',
          managementClientId: 'management-client-id',
          managementClientSecret: 'management-client-secret',
          managementDomain: 'codex-events-dev.eu.auth0.com',
          sessionConfiguration: {
            rolling: false
          },
          sessionSecret: 'session-secret'
        }
      }
    }
  } as H3Event
}

function createFixtureJwt(payload: Record<string, unknown>) {
  return [
    Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url'),
    Buffer.from(JSON.stringify(payload)).toString('base64url'),
    'signature'
  ].join('.')
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
        redirect_uri: 'https://dev.codex-events.com/auth/link/callback'
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
        redirect_uri: 'https://dev.codex-events.com/auth/link/callback'
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
      new URL('https://dev.codex-events.com/auth/link/callback?code=fixture&state=fixture'),
      { event }
    )
    expect(authenticatedSubject).toBe('auth0|existing-password-user')
    expect(getSession).toHaveBeenCalledWith({ event })
    expect(stateStoreDelete).toHaveBeenCalledWith('__a0_platform_account_link_session', { event })
    expect(transactionStoreDelete).toHaveBeenCalledWith('__a0_platform_account_link_tx', { event })
  })

  test('fails early when the Auth0 management token lacks update:users for account linking', async () => {
    const event = createEvent()
    const linking = await import('../../../../../server/domains/accounts/linking')
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url

      if (url === 'https://codex-events-dev.eu.auth0.com/oauth/token') {
        return new Response(JSON.stringify({
          access_token: createFixtureJwt({
            permissions: ['read:clients']
          }),
          scope: 'read:clients'
        }), {
          status: 200,
          headers: {
            'content-type': 'application/json'
          }
        })
      }

      return new Response('not found', { status: 404 })
    })

    vi.stubGlobal('fetch', fetchMock)

    await expect(linking.linkPlatformAccountIdentity(
      event,
      'auth0|existing-password-user',
      'google-oauth2|existing-google-user'
    )).rejects.toMatchObject({
      code: 'platform_account_linking_unavailable',
      message: 'Auth0 management token is missing the update:users scope required for account linking.'
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
