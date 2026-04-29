import type { H3Event } from 'h3'

import { beforeEach, describe, expect, test, vi } from 'vitest'

import { ApiError } from '../../../../server/http/api-error'
import {
  getRequestActor,
  getRequestLinkablePlatformAccountIdentity,
  requireAuthenticatedActor,
  requirePlatformActor
} from '../../../../server/auth/actor'
import { setDatabase } from '../../../../server/database/client'

type SessionUser = {
  sub: string
  email?: string | null
  email_verified?: boolean | null
  name?: string | null
  nickname?: string | null
}

type EventContext = H3Event['context'] & {
  auth0ClientOptions?: Record<string, unknown>
  runtimeConfig?: {
    auth0?: Record<string, unknown>
  }
}

function createEvent(sessionUser?: SessionUser | null) {
  const event = {
    context: {
      cloudflare: { env: {} },
      runtimeConfig: {
        auth0: {}
      }
    } satisfies EventContext
  } as H3Event

  vi.stubGlobal('useAuth0', vi.fn(() => ({
    getSession: vi.fn(async () => sessionUser ? { user: sessionUser } : null)
  })))
  vi.stubGlobal('useRuntimeConfig', ((runtimeEvent: H3Event) => runtimeEvent.context.runtimeConfig) as typeof useRuntimeConfig)

  return event
}

function createDatabaseMock(
  user?: Record<string, unknown> | null,
  options?: {
    auth0Subject?: string | null
    hasAcceptedCurrentPlatformDocuments?: boolean
    currentDocumentsAvailable?: boolean
  }
) {
  let currentDocumentCallCount = 0
  const auth0Subject = options?.auth0Subject
    ?? (typeof user?.auth0Subject === 'string' ? user.auth0Subject : null)
  const hasAcceptedCurrentPlatformDocuments = options?.hasAcceptedCurrentPlatformDocuments ?? true
  const currentDocumentsAvailable = options?.currentDocumentsAvailable ?? true

  return {
    query: {
      userAuthIdentities: {
        findFirst: vi.fn(async () => auth0Subject && user
          ? {
              id: 'identity_1',
              userId: user.id,
              auth0Subject,
              createdAt: '2026-03-22T12:00:00.000Z'
            }
          : undefined)
      },
      users: {
        findFirst: vi.fn(async () => user ?? undefined)
      },
      platformDocuments: {
        findFirst: vi.fn(async () => {
          if (!currentDocumentsAvailable) {
            return undefined
          }

          currentDocumentCallCount += 1

          return currentDocumentCallCount === 1
            ? { id: 'privacy_v1', documentType: 'privacy_policy' }
            : { id: 'terms_v1', documentType: 'platform_terms' }
        }),
        findMany: vi.fn(async () => {
          if (!currentDocumentsAvailable) {
            return []
          }

          return [
            { id: 'privacy_v1', documentType: 'privacy_policy', version: 1 },
            { id: 'terms_v1', documentType: 'platform_terms', version: 1 }
          ]
        })
      },
      userPlatformDocumentAcceptances: {
        findMany: vi.fn(async () => hasAcceptedCurrentPlatformDocuments
          ? [
              { platformDocumentId: 'privacy_v1' },
              { platformDocumentId: 'terms_v1' }
            ]
          : []
        )
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
      hasAcceptedCurrentPlatformDocuments: false
    })
  })

  test('returns an authenticated identity actor when no platform user exists', async () => {
    const event = createEvent({ sub: 'auth0|user_1', email: 'user@example.com' })
    setDatabase(event, createDatabaseMock())

    await expect(getRequestActor(event)).resolves.toMatchObject({
      kind: 'authenticated_identity',
      isAuthenticated: true,
      hasPlatformAccount: false,
      hasAcceptedCurrentPlatformDocuments: false,
      sessionUser: {
        sub: 'auth0|user_1',
        email: 'user@example.com'
      }
    })
  })

  test('derives a GitHub profile URL for authenticated GitHub identities', async () => {
    const event = createEvent({
      sub: 'github|user_1',
      email: 'user@example.com',
      nickname: 'github-user'
    })
    setDatabase(event, createDatabaseMock())

    await expect(getRequestActor(event)).resolves.toMatchObject({
      kind: 'authenticated_identity',
      sessionUser: {
        sub: 'github|user_1',
        githubProfileUrl: 'https://github.com/github-user'
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
      isPlatformAdmin: true
    }))

    await expect(getRequestActor(event)).resolves.toMatchObject({
      kind: 'platform_user',
      hasPlatformAccount: true,
      hasAcceptedCurrentPlatformDocuments: true,
      platformUser: {
        id: 'user_1',
        isPlatformAdmin: true
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
      isPlatformAdmin: false
    })
    setDatabase(event, database)

    const first = await getRequestActor(event)
    const second = await getRequestActor(event)

    expect(first).toBe(second)
    expect(database.query.users.findFirst).toHaveBeenCalledTimes(1)
  })

  test('reuses the linkable platform-account identity within the request', async () => {
    const event = createEvent({
      sub: 'google-oauth2|user_1',
      email: 'user@example.com',
      email_verified: true
    })
    const database = {
      query: {
        userAuthIdentities: {
          findFirst: vi.fn(async () => undefined)
        },
        users: {
          findFirst: vi.fn(async () => ({
            id: 'user_existing',
            auth0Subject: 'auth0|existing-password-user',
            email: 'user@example.com',
            displayName: 'Existing User',
            isPlatformAdmin: false
          }))
        },
        platformDocuments: {
          findFirst: vi.fn(),
          findMany: vi.fn(async () => [])
        },
        userPlatformDocumentAcceptances: {
          findMany: vi.fn(async () => [])
        }
      }
    } as never
    setDatabase(event, database)

    const actor = await getRequestActor(event)

    expect(actor).toMatchObject({
      kind: 'authenticated_identity',
      accountLink: {
        required: true,
        email: 'user@example.com',
        linkLoginHref: '/auth/link/login'
      }
    })
    expect(actor.sessionUser).not.toBeNull()

    const first = await getRequestLinkablePlatformAccountIdentity(event, actor.sessionUser!)
    const second = await getRequestLinkablePlatformAccountIdentity(event, actor.sessionUser!)

    expect(first).toEqual(second)
    expect(database.query.users.findFirst).toHaveBeenCalledTimes(1)
  })

  test('keeps a platform account actor consent-blocked when current platform documents are not accepted', async () => {
    const event = createEvent({ sub: 'auth0|user_1', email: 'user@example.com' })
    setDatabase(event, createDatabaseMock({
      id: 'user_1',
      auth0Subject: 'auth0|user_1',
      email: 'user@example.com',
      displayName: 'User One',
      isPlatformAdmin: false
    }, {
      hasAcceptedCurrentPlatformDocuments: false
    }))

    await expect(getRequestActor(event)).resolves.toMatchObject({
      kind: 'platform_user',
      hasPlatformAccount: true,
      hasAcceptedCurrentPlatformDocuments: false,
      platformUser: {
        id: 'user_1'
      }
    })
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

  test('requires current platform consent for regular platform authorization', async () => {
    const event = createEvent({ sub: 'auth0|user_1', email: 'user@example.com' })
    setDatabase(event, createDatabaseMock({
      id: 'user_1',
      auth0Subject: 'auth0|user_1',
      email: 'user@example.com',
      displayName: 'User One',
      isPlatformAdmin: false
    }, {
      hasAcceptedCurrentPlatformDocuments: false
    }))

    await expect(requirePlatformActor(event)).rejects.toMatchObject({
      code: 'platform_consent_required'
    })
  })
})
