import type { H3Event } from 'h3'

import { beforeEach, describe, expect, test, vi } from 'vitest'

import { ApiError } from '../../../../server/utils/api-error'
import { getRequestActor, requireAuthenticatedActor, requirePlatformActor } from '../../../../server/auth/actor'
import { setDatabase } from '../../../../server/database/client'

type SessionUser = {
  sub: string
  email?: string | null
  name?: string | null
}

type EventContext = H3Event['context'] & {
  auth0ClientOptions?: Record<string, unknown>
}

function createEvent(sessionUser?: SessionUser | null) {
  const event = {
    context: {
      cloudflare: { env: {} }
    } satisfies EventContext
  } as H3Event

  vi.stubGlobal('useAuth0', vi.fn(() => ({
    getSession: vi.fn(async () => sessionUser ? { user: sessionUser } : null)
  })))

  return event
}

function createDatabaseMock(user?: Record<string, unknown> | null) {
  return {
    query: {
      users: {
        findFirst: vi.fn(async () => user ?? undefined)
      }
    }
  } as never
}

beforeEach(() => {
  vi.unstubAllGlobals()
})

describe('request actor resolution', () => {
  test('returns an anonymous actor when there is no Auth0 session', async () => {
    const event = createEvent()
    setDatabase(event, createDatabaseMock())

    await expect(getRequestActor(event)).resolves.toMatchObject({
      kind: 'anonymous',
      isAuthenticated: false,
      hasPlatformAccount: false,
      onboardingState: null
    })
  })

  test('returns an authenticated identity actor when no platform user exists', async () => {
    const event = createEvent({ sub: 'auth0|user_1', email: 'user@example.com' })
    setDatabase(event, createDatabaseMock())

    await expect(getRequestActor(event)).resolves.toMatchObject({
      kind: 'authenticated_identity',
      isAuthenticated: true,
      hasPlatformAccount: false,
      onboardingState: 'terms_pending',
      sessionUser: {
        sub: 'auth0|user_1',
        email: 'user@example.com'
      }
    })
  })

  test('returns a platform actor when the Auth0 subject maps to an active platform user', async () => {
    const event = createEvent({ sub: 'auth0|user_1', email: 'user@example.com' })
    setDatabase(event, createDatabaseMock({
      id: 'user_1',
      auth0Subject: 'auth0|user_1',
      email: 'user@example.com',
      displayName: 'User One',
      isPlatformAdmin: true,
      onboardingState: 'completed'
    }))

    await expect(getRequestActor(event)).resolves.toMatchObject({
      kind: 'platform_user',
      hasPlatformAccount: true,
      onboardingState: 'completed',
      platformUser: {
        id: 'user_1',
        isPlatformAdmin: true,
        onboardingState: 'completed'
      }
    })
  })

  test('caches the request actor on the event context', async () => {
    const event = createEvent({ sub: 'auth0|user_1' })
    const database = createDatabaseMock({
      id: 'user_1',
      auth0Subject: 'auth0|user_1',
      email: 'user@example.com',
      displayName: 'User One',
      isPlatformAdmin: false,
      onboardingState: 'completed'
    })
    setDatabase(event, database)

    const first = await getRequestActor(event)
    const second = await getRequestActor(event)

    expect(first).toBe(second)
    expect(database.query.users.findFirst).toHaveBeenCalledTimes(1)
  })

  test('requires an authenticated actor for protected flows', async () => {
    const event = createEvent()
    setDatabase(event, createDatabaseMock())

    await expect(requireAuthenticatedActor(event)).rejects.toBeInstanceOf(ApiError)
  })

  test('requires a platform account for application-owned authorization', async () => {
    const event = createEvent({ sub: 'auth0|user_1' })
    setDatabase(event, createDatabaseMock())

    await expect(requirePlatformActor(event)).rejects.toBeInstanceOf(ApiError)
  })
})
