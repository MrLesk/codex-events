import type { H3Event } from 'h3'

import { vi } from 'vitest'

import { createDatabase, setDatabase } from '../../../server/database/client'
import { createTestD1Database, type TestD1Database } from './fake-d1'

interface TestSessionUser {
  sub: string
  email?: string | null
  name?: string | null
  nickname?: string | null
  picture?: string | null
  [key: string]: unknown
}

type EventContext = H3Event['context'] & {
  auth0ClientOptions?: Record<string, unknown>
  runtimeConfig?: {
    auth0?: Record<string, unknown>
    database?: {
      binding?: string
    }
    profileIcons?: {
      binding?: string
    }
    resend?: {
      apiKey?: string
      fromEmail?: string
      fromName?: string
      replyTo?: string
    }
    applicationReviewEmails?: {
      queueBinding?: string
      queueName?: string
      retryDelaySeconds?: number
    }
  }
}

export function stubAuth0Session(sessionUser: TestSessionUser | null = null) {
  vi.stubGlobal('useAuth0', vi.fn(() => ({
    getSession: vi.fn(async () => sessionUser ? { user: sessionUser } : null)
  })))
}

export function createBackendTestEvent(options?: {
  bindingName?: string
  d1Database?: TestD1Database
  sessionUser?: TestSessionUser | null
}) {
  const bindingName = options?.bindingName ?? 'DB'
  const d1Database = options?.d1Database ?? createTestD1Database()

  stubAuth0Session(options?.sessionUser ?? null)

  const event = {
    context: {
      cloudflare: {
        env: {
          [bindingName]: d1Database
        }
      },
      runtimeConfig: {
        auth0: {},
        database: {
          binding: bindingName
        }
      },
      auth0ClientOptions: {}
    } satisfies EventContext
  } as H3Event

  event.context.d1Database = d1Database as never
  setDatabase(event, createDatabase(d1Database as never))

  return {
    event,
    d1Database,
    database: event.context.appDb
  }
}

export function fixtureTimestamp(offsetSeconds = 0) {
  return new Date(Date.UTC(2026, 2, 22, 12, 0, offsetSeconds)).toISOString()
}
