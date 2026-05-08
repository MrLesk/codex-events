import { eq } from 'drizzle-orm'
import { afterEach, describe, expect, test, vi } from 'vitest'

import accountRegistrationPostHandler from '../../../../../server/api/account/registration.post'
import { platformDocuments, userAuthIdentities, users } from '../../../../../server/database/schema'
import { createApiRouteTestHarness } from '../../../../support/backend/api-route'

const {
  clearPlatformAccountLinkAuthentication,
  completePlatformAccountLinkAuthentication,
  readPlatformAccountLinkAuthenticatedSubject,
  startPlatformAccountLinkAuthentication
} = vi.hoisted(() => ({
  startPlatformAccountLinkAuthentication: vi.fn(),
  completePlatformAccountLinkAuthentication: vi.fn(),
  readPlatformAccountLinkAuthenticatedSubject: vi.fn(),
  clearPlatformAccountLinkAuthentication: vi.fn(async () => {})
}))

vi.mock('../../../../../server/domains/accounts/linking', async () => {
  const actual = await vi.importActual<typeof import('../../../../../server/domains/accounts/linking')>(
    '../../../../../server/domains/accounts/linking'
  )

  return {
    ...actual,
    startPlatformAccountLinkAuthentication,
    completePlatformAccountLinkAuthentication,
    readPlatformAccountLinkAuthenticatedSubject,
    clearPlatformAccountLinkAuthentication
  }
})

async function loadHandlers() {
  const [
    loginModule,
    callbackModule,
    completeModule
  ] = await Promise.all([
    import('../../../../../server/routes/auth/link/login'),
    import('../../../../../server/routes/auth/link/callback'),
    import('../../../../../server/routes/auth/link/complete')
  ])

  return {
    authLinkLoginHandler: loginModule.default,
    authLinkCallbackHandler: callbackModule.default,
    authLinkCompleteHandler: completeModule.default
  }
}

describe('Auth0 account-link routes', () => {
  const databases: Array<ReturnType<typeof createApiRouteTestHarness>> = []

  afterEach(async () => {
    vi.unstubAllGlobals()
    vi.resetModules()
    startPlatformAccountLinkAuthentication.mockReset()
    completePlatformAccountLinkAuthentication.mockReset()
    readPlatformAccountLinkAuthenticatedSubject.mockReset()
    clearPlatformAccountLinkAuthentication.mockReset()
    clearPlatformAccountLinkAuthentication.mockResolvedValue(undefined)

    while (databases.length > 0) {
      await databases.pop()?.d1Database.close()
    }
  })

  async function createLinkHarness() {
    const {
      authLinkLoginHandler,
      authLinkCallbackHandler,
      authLinkCompleteHandler
    } = await loadHandlers()
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/account/registration', handler: accountRegistrationPostHandler },
        { method: 'get', path: '/auth/link/login', handler: authLinkLoginHandler },
        { method: 'get', path: '/auth/link/callback', handler: authLinkCallbackHandler },
        { method: 'get', path: '/auth/link/complete', handler: authLinkCompleteHandler }
      ],
      runtimeConfig: {
        auth0: {
          appBaseUrl: 'https://dev.codex-events.com',
          managementDomain: 'codex-events-dev.eu.auth0.com',
          managementClientId: 'management-client-id',
          managementClientSecret: 'management-client-secret',
          managementAudience: 'https://codex-events-dev.eu.auth0.com/api/v2/',
          databaseConnectionName: 'Username-Password-Authentication',
          accountLinkChallengeSecret: 'link-secret'
        }
      }
    })
    databases.push(harness)

    return harness
  }

  async function seedExistingPlatformAccount(harness: ReturnType<typeof createApiRouteTestHarness>) {
    await harness.database.insert(users).values({
      id: 'existing_platform_user',
      auth0Subject: 'auth0|existing-password-user',
      email: 'existing-user@example.com',
      displayName: 'Existing User'
    })
    await harness.database.insert(platformDocuments).values([
      {
        id: 'privacy_v1',
        documentType: 'privacy_policy',
        version: 1,
        title: 'Privacy Policy v1',
        content: 'Privacy',
        publishedAt: '2026-03-01T00:00:00.000Z'
      },
      {
        id: 'terms_v1',
        documentType: 'platform_terms',
        version: 1,
        title: 'Platform Terms v1',
        content: 'Terms',
        publishedAt: '2026-03-02T00:00:00.000Z'
      }
    ])
  }

  async function createLinkChallengeCookie(harness: ReturnType<typeof createApiRouteTestHarness>) {
    const response = await harness.request('/api/account/registration', {
      method: 'POST',
      body: JSON.stringify({
        privacyPolicyDocumentId: 'privacy_v1',
        platformTermsDocumentId: 'terms_v1',
        returnTo: '/events/fixture/register'
      })
    })

    expect(response.status).toBe(409)
    return response.headers.get('set-cookie')?.split(';', 1)[0] ?? ''
  }

  test('GET /auth/link/login starts explicit password reauthentication from a valid challenge', async () => {
    const harness = await createLinkHarness()
    await seedExistingPlatformAccount(harness)

    vi.stubGlobal('useAuth0', vi.fn(() => ({
      getSession: vi.fn(async () => ({
        user: {
          sub: 'google-oauth2|existing-google-user',
          email: 'existing-user@example.com',
          email_verified: true,
          name: 'Existing User'
        }
      }))
    })))
    startPlatformAccountLinkAuthentication.mockResolvedValue(new URL('https://auth.example.test/authorize'))

    const cookie = await createLinkChallengeCookie(harness)
    const response = await harness.request('/auth/link/login', {
      headers: {
        cookie
      }
    })

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('https://auth.example.test/authorize')
    expect(startPlatformAccountLinkAuthentication).toHaveBeenCalledWith(
      expect.any(Object),
      'existing-user@example.com'
    )
  })

  test('GET /auth/link/login bootstraps a challenge from the authenticated social identity when no cookie exists', async () => {
    const harness = await createLinkHarness()
    await seedExistingPlatformAccount(harness)

    vi.stubGlobal('useAuth0', vi.fn(() => ({
      getSession: vi.fn(async () => ({
        user: {
          sub: 'google-oauth2|existing-google-user',
          email: 'existing-user@example.com',
          email_verified: true,
          name: 'Existing User'
        }
      }))
    })))
    startPlatformAccountLinkAuthentication.mockResolvedValue(new URL('https://auth.example.test/authorize'))

    const response = await harness.request('/auth/link/login')

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('https://auth.example.test/authorize')
    expect(response.headers.get('set-cookie')).toContain('codex_platform_account_link=')
    expect(startPlatformAccountLinkAuthentication).toHaveBeenCalledWith(
      expect.any(Object),
      'existing-user@example.com'
    )
  })

  test('GET /auth/link/callback completes link authentication and defers identity verification to a fresh request', async () => {
    const harness = await createLinkHarness()
    await seedExistingPlatformAccount(harness)

    completePlatformAccountLinkAuthentication.mockResolvedValue(undefined)
    vi.stubGlobal('useAuth0', vi.fn(() => ({
      getSession: vi.fn(async () => ({
        user: {
          sub: 'google-oauth2|existing-google-user',
          email: 'existing-user@example.com',
          email_verified: true,
          name: 'Existing User'
        }
      }))
    })))

    const cookie = await createLinkChallengeCookie(harness)
    const response = await harness.request('/auth/link/callback?code=fixture&state=fixture', {
      headers: {
        cookie
      }
    })

    expect(completePlatformAccountLinkAuthentication).toHaveBeenCalledWith(expect.any(Object))
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('/auth/link/complete')
  })

  test('GET /auth/link/complete links the social identity after isolated password-account verification', async () => {
    const harness = await createLinkHarness()
    await seedExistingPlatformAccount(harness)

    vi.stubGlobal('useAuth0', vi.fn(() => ({
      getSession: vi.fn(async () => ({
        user: {
          sub: 'google-oauth2|existing-google-user',
          email: 'existing-user@example.com',
          email_verified: true,
          name: 'Existing User'
        }
      }))
    })))
    readPlatformAccountLinkAuthenticatedSubject.mockResolvedValue('auth0|existing-password-user')
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url

      if (url === 'https://codex-events-dev.eu.auth0.com/oauth/token') {
        return new Response(JSON.stringify({
          access_token: 'management-access-token',
          scope: 'read:users update:users'
        }), {
          status: 200,
          headers: {
            'content-type': 'application/json'
          }
        })
      }

      if (url === 'https://codex-events-dev.eu.auth0.com/api/v2/users/auth0%7Cexisting-password-user') {
        expect(init?.method).toBe('GET')
        expect(init?.headers).toMatchObject({
          authorization: 'Bearer management-access-token'
        })

        return new Response(JSON.stringify({
          identities: [
            {
              provider: 'auth0',
              user_id: 'existing-password-user'
            }
          ]
        }), {
          status: 200,
          headers: {
            'content-type': 'application/json'
          }
        })
      }

      if (url === 'https://codex-events-dev.eu.auth0.com/api/v2/users/auth0%7Cexisting-password-user/identities') {
        expect(init?.method).toBe('POST')
        expect(init?.headers).toMatchObject({
          'authorization': 'Bearer management-access-token',
          'content-type': 'application/json'
        })
        expect(JSON.parse(String(init?.body))).toEqual({
          provider: 'google-oauth2',
          user_id: 'existing-google-user'
        })

        return new Response(JSON.stringify([
          {
            provider: 'auth0',
            user_id: 'existing-password-user'
          },
          {
            provider: 'google-oauth2',
            user_id: 'existing-google-user'
          }
        ]), { status: 201 })
      }

      return new Response('not found', { status: 404 })
    })
    vi.stubGlobal('fetch', fetchMock)

    const cookie = await createLinkChallengeCookie(harness)
    const response = await harness.request('/auth/link/complete', {
      headers: {
        cookie
      }
    })

    expect(readPlatformAccountLinkAuthenticatedSubject).toHaveBeenCalledWith(expect.any(Object))
    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(clearPlatformAccountLinkAuthentication).toHaveBeenCalledWith(expect.any(Object))
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('/account/register?returnTo=%2Fevents%2Ffixture%2Fregister')
    const storedGoogleIdentity = await harness.database.query.userAuthIdentities.findFirst({
      where: eq(userAuthIdentities.auth0Subject, 'google-oauth2|existing-google-user')
    })

    expect(storedGoogleIdentity).toMatchObject({
      userId: 'existing_platform_user',
      auth0Subject: 'google-oauth2|existing-google-user'
    })
  })

  test('GET /auth/link/complete redirects with mismatch when isolated verification resolves to a different password account', async () => {
    const harness = await createLinkHarness()
    await seedExistingPlatformAccount(harness)

    vi.stubGlobal('useAuth0', vi.fn(() => ({
      getSession: vi.fn(async () => ({
        user: {
          sub: 'google-oauth2|existing-google-user',
          email: 'existing-user@example.com',
          email_verified: true,
          name: 'Existing User'
        }
      }))
    })))
    readPlatformAccountLinkAuthenticatedSubject.mockResolvedValue('auth0|different-password-user')

    const cookie = await createLinkChallengeCookie(harness)
    const response = await harness.request('/auth/link/complete', {
      headers: {
        cookie
      }
    })

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('/account/register?returnTo=%2Fevents%2Ffixture%2Fregister&linkingError=mismatch')
  })
})
