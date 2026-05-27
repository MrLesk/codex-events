import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { ensureStableAuth0Personas } from '../../../bdd/support/auth0-management'

const environment = {
  NUXT_AUTH0_APP_BASE_URL: 'http://localhost:3000',
  NUXT_AUTH0_CLIENT_ID: 'nuxt-client-id',
  NUXT_AUTH0_DATABASE_CONNECTION_NAME: 'Username-Password-Authentication',
  AUTH0_MANAGEMENT_DOMAIN: 'example.us.auth0.com',
  AUTH0_MGMT_CLIENT_ID: 'client-id',
  AUTH0_MGMT_CLIENT_SECRET: 'client-secret',
  AUTH0_MANAGEMENT_AUDIENCE: 'https://example.us.auth0.com/api/v2/',
  E2E_PLATFORM_ADMIN_EMAIL: 'platform-admin@example.com',
  E2E_PLATFORM_ADMIN_PASSWORD: 'password-1',
  E2E_EVENT_ADMIN_EMAIL: 'event-admin@example.com',
  E2E_EVENT_ADMIN_PASSWORD: 'password-2',
  E2E_JUDGE_EMAIL: 'judge@example.com',
  E2E_JUDGE_PASSWORD: 'password-3',
  E2E_REGULAR_USER_EMAIL: 'regular-user@example.com',
  E2E_REGULAR_USER_PASSWORD: 'password-4'
}

const stableUsers = [
  {
    key: 'platform_admin',
    email: environment.E2E_PLATFORM_ADMIN_EMAIL,
    displayName: 'Platform Admin',
    nickname: 'platform-admin',
    password: environment.E2E_PLATFORM_ADMIN_PASSWORD
  },
  {
    key: 'event_admin',
    email: environment.E2E_EVENT_ADMIN_EMAIL,
    displayName: 'Event Admin',
    nickname: 'event-admin',
    password: environment.E2E_EVENT_ADMIN_PASSWORD
  },
  {
    key: 'judge',
    email: environment.E2E_JUDGE_EMAIL,
    displayName: 'Judge Persona',
    nickname: 'judge-persona',
    password: environment.E2E_JUDGE_PASSWORD
  },
  {
    key: 'regular_user',
    email: environment.E2E_REGULAR_USER_EMAIL,
    displayName: 'Regular User',
    nickname: 'regular-user',
    password: environment.E2E_REGULAR_USER_PASSWORD
  }
] as const

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'content-type': 'application/json'
    },
    ...init
  })
}

describe('stable Auth0 persona reconciliation', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('updates existing personas and clears brute-force blocks by user id', async () => {
    const fetchMock = vi.mocked(fetch)

    fetchMock.mockResolvedValueOnce(jsonResponse({ access_token: 'management-token' }))

    for (const user of stableUsers) {
      fetchMock.mockResolvedValueOnce(jsonResponse([{
        user_id: `auth0|${user.key}`,
        email: user.email,
        identities: [{ connection: environment.NUXT_AUTH0_DATABASE_CONNECTION_NAME }]
      }]))
      fetchMock.mockResolvedValueOnce(jsonResponse({
        user_id: `auth0|${user.key}`,
        email: user.email
      }))
      fetchMock.mockResolvedValueOnce(jsonResponse({
        user_id: `auth0|${user.key}`,
        email: user.email
      }))
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))
    }

    const personas = await ensureStableAuth0Personas(environment)

    expect(personas.map(persona => persona.auth0Subject)).toEqual(
      stableUsers.map(user => `auth0|${user.key}`)
    )

    const patchCalls = fetchMock.mock.calls.filter(([url, init]) =>
      typeof url === 'string'
      && url.includes('/api/v2/users/')
      && typeof init === 'object'
      && init !== null
      && 'method' in init
      && init.method === 'PATCH'
    )
    const blockClearCalls = fetchMock.mock.calls.filter(([url, init]) =>
      typeof url === 'string'
      && url.includes('/api/v2/user-blocks/')
      && typeof init === 'object'
      && init !== null
      && 'method' in init
      && init.method === 'DELETE'
    )

    expect(patchCalls).toHaveLength(stableUsers.length * 2)
    expect(blockClearCalls).toHaveLength(stableUsers.length)

    for (const [index, user] of stableUsers.entries()) {
      const profilePatch = patchCalls[index * 2]?.[1]
      const passwordPatch = patchCalls[index * 2 + 1]?.[1]
      const blockClear = blockClearCalls[index]?.[0]
      const userId = `auth0|${user.key}`

      expect(JSON.parse(String(profilePatch?.body))).toEqual({
        name: user.displayName,
        nickname: user.nickname,
        blocked: false
      })
      expect(JSON.parse(String(passwordPatch?.body))).toEqual({
        connection: environment.NUXT_AUTH0_DATABASE_CONNECTION_NAME,
        password: user.password
      })
      expect(String(blockClear)).toContain(`/api/v2/user-blocks/${encodeURIComponent(userId)}`)
    }
  })
})
