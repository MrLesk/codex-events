import { afterEach, describe, expect, test, vi } from 'vitest'

import accountRegistrationPostHandler from '../../../../../server/api/account/registration.post'
import authLinkCallbackHandler from '../../../../../server/routes/auth/link/callback'
import authLinkCompleteHandler from '../../../../../server/routes/auth/link/complete'
import authLinkLoginHandler from '../../../../../server/routes/auth/link/login'
import { platformDocuments, users } from '../../../../../server/database/schema'
import { createApiRouteTestHarness } from '../../../../support/backend/api-route'

describe('Auth0 account-link routes', () => {
  const databases: Array<ReturnType<typeof createApiRouteTestHarness>> = []

  afterEach(async () => {
    vi.unstubAllGlobals()

    while (databases.length > 0) {
      await databases.pop()?.d1Database.close()
    }
  })

  function createLinkHarness() {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'post', path: '/api/account/registration', handler: accountRegistrationPostHandler },
        { method: 'get', path: '/auth/link/login', handler: authLinkLoginHandler },
        { method: 'get', path: '/auth/link/callback', handler: authLinkCallbackHandler },
        { method: 'get', path: '/auth/link/complete', handler: authLinkCompleteHandler }
      ],
      runtimeConfig: {
        auth0: {
          appBaseUrl: 'https://dev.codex-hackathons.com',
          managementDomain: 'codex-hackathons-dev.eu.auth0.com',
          managementClientId: 'management-client-id',
          managementClientSecret: 'management-client-secret',
          managementAudience: 'https://codex-hackathons-dev.eu.auth0.com/api/v2/',
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
        returnTo: '/hackathons/fixture/register'
      })
    })

    expect(response.status).toBe(409)
    return response.headers.get('set-cookie')?.split(';', 1)[0] ?? ''
  }

  test('GET /auth/link/login starts explicit password reauthentication from a valid challenge', async () => {
    const harness = createLinkHarness()
    await seedExistingPlatformAccount(harness)

    const socialSessionUser = {
      sub: 'google-oauth2|existing-google-user',
      email: 'existing-user@example.com',
      email_verified: true,
      name: 'Existing User'
    }
    const startInteractiveLogin = vi.fn(async () => new URL('https://auth.example.test/authorize'))

    vi.stubGlobal('useAuth0', vi.fn(() => ({
      getSession: vi.fn(async () => ({ user: socialSessionUser })),
      startInteractiveLogin,
      completeInteractiveLogin: vi.fn()
    })))

    const cookie = await createLinkChallengeCookie(harness)
    const response = await harness.request('/auth/link/login', {
      headers: {
        cookie
      }
    })

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('https://auth.example.test/authorize')
    expect(startInteractiveLogin).toHaveBeenCalledWith({
      authorizationParams: {
        connection: 'Username-Password-Authentication',
        prompt: 'login',
        login_hint: 'existing-user@example.com',
        redirect_uri: 'https://dev.codex-hackathons.com/auth/link/callback'
      }
    })
  })

  test('GET /auth/link/login bootstraps a challenge from the authenticated social identity when no cookie exists', async () => {
    const harness = createLinkHarness()
    await seedExistingPlatformAccount(harness)

    const socialSessionUser = {
      sub: 'google-oauth2|existing-google-user',
      email: 'existing-user@example.com',
      email_verified: true,
      name: 'Existing User'
    }
    const startInteractiveLogin = vi.fn(async () => new URL('https://auth.example.test/authorize'))

    vi.stubGlobal('useAuth0', vi.fn(() => ({
      getSession: vi.fn(async () => ({ user: socialSessionUser })),
      startInteractiveLogin,
      completeInteractiveLogin: vi.fn()
    })))

    const response = await harness.request('/auth/link/login')

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('https://auth.example.test/authorize')
    expect(response.headers.get('set-cookie')).toContain('codex_platform_account_link=')
    expect(startInteractiveLogin).toHaveBeenCalledWith({
      authorizationParams: {
        connection: 'Username-Password-Authentication',
        prompt: 'login',
        login_hint: 'existing-user@example.com',
        redirect_uri: 'https://dev.codex-hackathons.com/auth/link/callback'
      }
    })
  })

  test('GET /auth/link/callback completes login and defers identity verification to a fresh request', async () => {
    const harness = createLinkHarness()
    await seedExistingPlatformAccount(harness)

    const socialSessionUser = {
      sub: 'google-oauth2|existing-google-user',
      email: 'existing-user@example.com',
      email_verified: true,
      name: 'Existing User'
    }
    const primarySessionUser = {
      sub: 'auth0|existing-password-user',
      email: 'existing-user@example.com',
      email_verified: true,
      name: 'Existing User'
    }
    let currentSessionUser = socialSessionUser
    const completeInteractiveLogin = vi.fn(async () => {
      currentSessionUser = primarySessionUser
    })
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url

      if (url === 'https://codex-hackathons-dev.eu.auth0.com/oauth/token') {
        return new Response(JSON.stringify({ access_token: 'management-access-token' }), {
          status: 200,
          headers: {
            'content-type': 'application/json'
          }
        })
      }

      if (url === 'https://codex-hackathons-dev.eu.auth0.com/api/v2/users/auth0%7Cexisting-password-user/identities') {
        expect(init?.method).toBe('POST')
        expect(init?.headers).toMatchObject({
          'authorization': 'Bearer management-access-token',
          'content-type': 'application/json'
        })
        expect(JSON.parse(String(init?.body))).toEqual({
          provider: 'google-oauth2',
          user_id: 'existing-google-user'
        })

        return new Response(JSON.stringify({}), { status: 201 })
      }

      return new Response('not found', { status: 404 })
    })

    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('useAuth0', vi.fn(() => ({
      getSession: vi.fn(async () => ({ user: currentSessionUser })),
      startInteractiveLogin: vi.fn(),
      completeInteractiveLogin
    })))

    const cookie = await createLinkChallengeCookie(harness)
    const response = await harness.request('/auth/link/callback?code=fixture&state=fixture', {
      headers: {
        cookie
      }
    })

    expect(completeInteractiveLogin).toHaveBeenCalled()
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('/auth/link/complete')
    expect(fetchMock).not.toHaveBeenCalled()

    const completeResponse = await harness.request('/auth/link/complete', {
      headers: {
        cookie
      }
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(completeResponse.status).toBe(302)
    expect(completeResponse.headers.get('location')).toBe('/account/register?returnTo=%2Fhackathons%2Ffixture%2Fregister')
    expect(completeResponse.headers.get('set-cookie')).toContain('codex_platform_account_link=')
  })

  test('GET /auth/link/complete redirects with mismatch when the fresh session is not the expected password account', async () => {
    const harness = createLinkHarness()
    await seedExistingPlatformAccount(harness)

    vi.stubGlobal('useAuth0', vi.fn(() => ({
      getSession: vi.fn(async () => ({
        user: {
          sub: 'google-oauth2|existing-google-user',
          email: 'existing-user@example.com',
          email_verified: true,
          name: 'Existing User'
        }
      })),
      startInteractiveLogin: vi.fn(),
      completeInteractiveLogin: vi.fn()
    })))

    const cookie = await createLinkChallengeCookie(harness)

    vi.stubGlobal('useAuth0', vi.fn(() => ({
      getSession: vi.fn(async () => ({
        user: {
          sub: 'auth0|different-password-user',
          email: 'different-user@example.com',
          email_verified: true,
          name: 'Different User'
        }
      })),
      startInteractiveLogin: vi.fn(),
      completeInteractiveLogin: vi.fn()
    })))

    const response = await harness.request('/auth/link/complete', {
      headers: {
        cookie
      }
    })

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('/account/register?returnTo=%2Fhackathons%2Ffixture%2Fregister&linkingError=mismatch')
  })
})
