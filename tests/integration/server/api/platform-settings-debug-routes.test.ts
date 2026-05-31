import { afterEach, describe, expect, test, vi } from 'vitest'

import platformSettingsDebugHandler from '../../../../server/api/platform-settings/debug.get'
import { users } from '../../../../server/database/schema'
import { createApiRouteTestHarness } from '../../../support/backend/api-route'

async function seedPlatformUser(
  harness: ReturnType<typeof createApiRouteTestHarness>,
  input: {
    id: string
    auth0Subject: string
    email: string
    isPlatformAdmin: boolean
  }
) {
  await harness.database.insert(users).values({
    id: input.id,
    auth0Subject: input.auth0Subject,
    email: input.email,
    displayName: input.email,
    isPlatformAdmin: input.isPlatformAdmin
  })
}

describe('platform settings debug route', () => {
  const harnesses: Array<ReturnType<typeof createApiRouteTestHarness>> = []

  afterEach(async () => {
    vi.unstubAllGlobals()

    while (harnesses.length > 0) {
      await harnesses.pop()?.d1Database.close()
    }
  })

  test('platform admins can read the derived Luma webhook URL', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/platform-settings/debug', handler: platformSettingsDebugHandler }
      ],
      sessionUser: {
        sub: 'auth0|platform_admin',
        email: 'platform-admin@example.com'
      },
      runtimeConfig: {
        auth0: {
          appBaseUrl: 'https://test.codex-events.com'
        }
      }
    })
    harnesses.push(harness)
    await seedPlatformUser(harness, {
      id: 'platform_admin',
      auth0Subject: 'auth0|platform_admin',
      email: 'platform-admin@example.com',
      isPlatformAdmin: true
    })

    const response = await harness.request('/api/platform-settings/debug')

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      data: {
        luma: {
          webhookUrl: 'https://test.codex-events.com/api/public/luma/webhooks'
        }
      }
    })
  })

  test('regular platform users cannot read platform debug settings', async () => {
    const harness = createApiRouteTestHarness({
      routes: [
        { method: 'get', path: '/api/platform-settings/debug', handler: platformSettingsDebugHandler }
      ],
      sessionUser: {
        sub: 'auth0|regular_user',
        email: 'regular@example.com'
      },
      runtimeConfig: {
        auth0: {
          appBaseUrl: 'https://test.codex-events.com'
        }
      }
    })
    harnesses.push(harness)
    await seedPlatformUser(harness, {
      id: 'regular_user',
      auth0Subject: 'auth0|regular_user',
      email: 'regular@example.com',
      isPlatformAdmin: false
    })

    const response = await harness.request('/api/platform-settings/debug')

    expect(response.status).toBe(403)
  })
})
