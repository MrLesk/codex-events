import { afterEach, describe, expect, test, vi } from 'vitest'

import { createApiRouteTestHarness } from '../../../../support/backend/api-route'

const authenticateWithCodex = vi.hoisted(() => vi.fn())

vi.mock('../../../../../server/auth/local-codex-auth', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../../../server/auth/local-codex-auth')>()

  return {
    ...original,
    authenticateWithCodex
  }
})

async function loadHandler() {
  const loginModule = await import('../../../../../server/routes/auth/login')

  return loginModule.default
}

afterEach(() => {
  authenticateWithCodex.mockReset()
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('application login route', () => {
  test('creates a local session from Codex and returns to the requested page', async () => {
    authenticateWithCodex.mockResolvedValue({
      sub: 'local-chatgpt|developer@example.com',
      email: 'developer@example.com',
      email_verified: true,
      name: null,
      nickname: null,
      picture: null
    })
    const handler = await loadHandler()
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/auth/login', handler }
      ],
      runtimeConfig: {
        localCodexAuth: true,
        auth0: {
          appBaseUrl: 'http://localhost:3000'
        }
      },
      autoAcceptCurrentPlatformDocuments: false
    })

    const response = await harness.request('/auth/login?returnTo=%2Faccount')

    expect(authenticateWithCodex).toHaveBeenCalledOnce()
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('/account')
    expect(response.headers.get('set-cookie')).toContain(
      'codex-events-local-user=developer%40example.com'
    )
  })

  test('preserves Auth0 interactive login when local auth is disabled', async () => {
    const startInteractiveLogin = vi.fn(async () => new URL('https://login.example.com/authorize'))
    const handler = await loadHandler()
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/auth/login', handler }
      ],
      runtimeConfig: {
        localCodexAuth: false,
        auth0: {
          appBaseUrl: 'https://events.example.com'
        }
      },
      autoAcceptCurrentPlatformDocuments: false
    })

    vi.stubGlobal('useAuth0', vi.fn(() => ({
      getSession: vi.fn(async () => null),
      startInteractiveLogin
    })))

    const response = await harness.request('/auth/login?returnTo=%2Faccount')

    expect(authenticateWithCodex).not.toHaveBeenCalled()
    expect(startInteractiveLogin).toHaveBeenCalledWith({
      appState: {
        returnTo: 'https://events.example.com/account'
      }
    })
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('https://login.example.com/authorize')
  })
})
