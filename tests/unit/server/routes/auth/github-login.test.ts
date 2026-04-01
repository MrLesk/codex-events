import { afterEach, describe, expect, test, vi } from 'vitest'

import githubLoginHandler from '../../../../../server/routes/auth/login/github'
import { createApiRouteTestHarness } from '../../../../support/backend/api-route'

describe('Auth0 GitHub login route', () => {
  const databases: Array<ReturnType<typeof createApiRouteTestHarness>> = []

  afterEach(async () => {
    vi.unstubAllGlobals()

    while (databases.length > 0) {
      await databases.pop()?.d1Database.close()
    }
  })

  test('GET /auth/login/github starts interactive login with the configured GitHub connection', async () => {
    const startInteractiveLogin = vi.fn(async () => new URL('https://auth.example.test/authorize'))
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/auth/login/github', handler: githubLoginHandler }
      ],
      runtimeConfig: {
        auth0: {
          githubConnectionName: 'codex-github',
          appBaseUrl: 'https://dev.codex-hackathons.com'
        }
      }
    })
    databases.push(harness)
    vi.stubGlobal('useAuth0', vi.fn(() => ({
      startInteractiveLogin
    })))

    const response = await harness.request('/auth/login/github?returnTo=/hackathons/fixture/register')

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('https://auth.example.test/authorize')
    expect(startInteractiveLogin).toHaveBeenCalledWith({
      appState: {
        returnTo: '/hackathons/fixture/register'
      },
      authorizationParams: {
        connection: 'codex-github',
        scope: 'openid profile email',
        connection_scope: 'user:email'
      }
    })
  })

  test('GET /auth/login/github normalizes unsafe return targets back to the account dashboard', async () => {
    const startInteractiveLogin = vi.fn(async () => new URL('https://auth.example.test/authorize'))
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/auth/login/github', handler: githubLoginHandler }
      ],
      runtimeConfig: {
        auth0: {
          githubConnectionName: 'github',
          appBaseUrl: 'https://dev.codex-hackathons.com'
        }
      }
    })
    databases.push(harness)
    vi.stubGlobal('useAuth0', vi.fn(() => ({
      startInteractiveLogin
    })))

    const response = await harness.request('/auth/login/github?returnTo=https://example.com/phish')

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('https://auth.example.test/authorize')
    expect(startInteractiveLogin).toHaveBeenCalledWith({
      appState: {
        returnTo: '/account'
      },
      authorizationParams: {
        connection: 'github',
        scope: 'openid profile email',
        connection_scope: 'user:email'
      }
    })
  })
})
