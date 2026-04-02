import type { H3Event } from 'h3'

import { afterEach, describe, expect, test, vi } from 'vitest'
import { eq } from 'drizzle-orm'

import { createDatabase } from '../../../../server/database/client'
import {
  auditLogs,
  hackathonTermsDocuments,
  hackathons,
  userApplications,
  users
} from '../../../../server/database/schema'
import {
  buildApplicationLumaSyncQueueMessage,
  enqueueApplicationLumaSyncMessage,
  processApplicationLumaSyncQueueBatch,
  processApplicationLumaSyncQueueMessage,
  recoverStaleApplicationLumaSyncMessages,
  resetApplicationLumaSyncStartupRecoveryForTest,
  resolveLumaEmailFromUsername,
  scheduleApplicationLumaSyncStartupRecovery
} from '../../../../server/utils/application-luma-sync-queue'
import { createTestD1Database } from '../../../support/backend/fake-d1'

function createEvent(options?: {
  queueProducer?: {
    send: (message: unknown, options?: unknown) => Promise<void>
  }
  runtimeConfig?: Record<string, unknown>
}) {
  return {
    context: {
      cloudflare: {
        env: options?.queueProducer
          ? { APPLICATION_LUMA_SYNC_QUEUE: options.queueProducer }
          : {}
      },
      runtimeConfig: options?.runtimeConfig ?? {
        luma: {
          queueBinding: 'APPLICATION_LUMA_SYNC_QUEUE',
          queueName: 'codex-hackathons-application-luma-sync',
          retryDelaySeconds: 120
        }
      }
    }
  } as H3Event
}

function createQueueMessage(options?: {
  body?: unknown
  attempts?: number
}) {
  return {
    id: 'msg_1',
    attempts: options?.attempts ?? 1,
    body: options?.body ?? buildApplicationLumaSyncQueueMessage({
      applicationId: 'application_1',
      decision: 'approved'
    }),
    ack: vi.fn(),
    retry: vi.fn()
  }
}

function createJsonResponse(body: unknown, status: number = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json'
    }
  })
}

function createHtmlResponse(html: string, status: number = 200) {
  return new Response(html, {
    status,
    headers: {
      'content-type': 'text/html'
    }
  })
}

async function seedLumaSyncContext(options?: {
  decision?: 'approved' | 'rejected'
  lumaSyncStatus?: typeof userApplications.$inferSelect['lumaSyncStatus']
  lumaEmail?: string | null
  lumaUsername?: string | null
  requireLumaEmail?: boolean
  lumaEventUrl?: string | null
  lumaEventApiId?: string | null
}) {
  const d1Database = createTestD1Database()
  const database = createDatabase(d1Database as never)
  const decision = options?.decision ?? 'approved'

  await database.insert(users).values([
    {
      id: 'platform_admin',
      auth0Subject: 'auth0|platform_admin',
      email: 'platform-admin@example.com',
      displayName: 'Platform Admin',
      isPlatformAdmin: true
    },
    {
      id: 'regular_user',
      auth0Subject: 'auth0|regular_user',
      email: 'regular@example.com',
      displayName: 'Regular User',
      lumaEmail: options?.lumaEmail ?? 'regular@example.com',
      lumaUsername: options?.lumaUsername ?? 'bpirvu'
    }
  ])

  await database.insert(hackathons).values({
    id: 'hackathon_1',
    name: 'Fixture Hackathon',
    slug: 'fixture-hackathon',
    description: 'Fixture hackathon',
    city: 'Vienna',
    country: 'Austria',
    address: 'Fixture Address',
    registrationOpensAt: '2026-03-20T12:00:00.000Z',
    registrationClosesAt: '2026-03-23T12:00:00.000Z',
    submissionOpensAt: '2026-03-23T12:00:00.000Z',
    submissionClosesAt: '2026-03-25T12:00:00.000Z',
    state: 'registration_open',
    maxTeamMembers: 5,
    requireLumaEmail: options?.requireLumaEmail ?? true,
    lumaEventUrl: options?.lumaEventUrl ?? 'https://luma.com/codex',
    lumaEventApiId: options?.lumaEventApiId ?? 'evt-123',
    currentApplicationTermsDocumentId: null,
    currentWinnerTermsDocumentId: null,
    createdByUserId: 'platform_admin'
  })

  await database.insert(hackathonTermsDocuments).values({
    id: 'terms_app_1',
    hackathonId: 'hackathon_1',
    documentType: 'application_terms',
    version: 1,
    title: 'Application Terms v1',
    content: 'Application terms one',
    publishedAt: '2026-03-01T00:00:00.000Z'
  })

  await database.insert(userApplications).values({
    id: 'application_1',
    hackathonId: 'hackathon_1',
    userId: 'regular_user',
    status: decision,
    lumaSyncStatus: options?.lumaSyncStatus ?? 'not_synced',
    submittedAt: '2026-03-22T12:10:00.000Z',
    reviewedAt: '2026-03-22T12:30:00.000Z',
    reviewedByUserId: 'platform_admin',
    applicationTermsDocumentId: 'terms_app_1',
    applicationTermsAcceptedAt: '2026-03-22T12:10:00.000Z',
    createdAt: '2026-03-22T12:10:00.000Z',
    updatedAt: '2026-03-22T12:30:00.000Z'
  })

  return {
    d1Database,
    database
  }
}

describe('application luma sync queue utilities', () => {
  const d1Databases: Array<ReturnType<typeof createTestD1Database>> = []

  afterEach(async () => {
    while (d1Databases.length > 0) {
      await d1Databases.pop()?.close()
    }

    resetApplicationLumaSyncStartupRecoveryForTest()
    vi.unstubAllGlobals()
  })

  test('enqueue sends json payload to the configured queue binding', async () => {
    const send = vi.fn(async () => undefined)
    const event = createEvent({
      queueProducer: { send }
    })

    const result = await enqueueApplicationLumaSyncMessage(event, buildApplicationLumaSyncQueueMessage({
      applicationId: 'application_1',
      decision: 'approved'
    }))

    expect(result).toEqual({
      status: 'enqueued'
    })
    expect(send).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenCalledWith(expect.objectContaining({
      applicationId: 'application_1',
      decision: 'approved'
    }), {
      contentType: 'json'
    })
  })

  test('enqueue skips when queue binding is not available', async () => {
    const result = await enqueueApplicationLumaSyncMessage(createEvent(), buildApplicationLumaSyncQueueMessage({
      applicationId: 'application_1',
      decision: 'rejected'
    }))

    expect(result).toEqual({
      status: 'skipped',
      reason: 'queue_binding_missing:APPLICATION_LUMA_SYNC_QUEUE'
    })
  })

  test('queue message processing stores approve_synced after a successful Luma sync', async () => {
    const { d1Database, database } = await seedLumaSyncContext()
    d1Databases.push(d1Database)
    const message = createQueueMessage()
    const fetchImpl = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url)

      if (url.pathname === '/v1/event/get-guest') {
        expect(url.searchParams.get('id')).toBe('regular@example.com')
        return createJsonResponse({
          guest: {
            id: 'gst-123',
            user_email: 'regular@example.com'
          }
        })
      }

      if (url.pathname === '/v1/event/update-guest-status') {
        expect(init?.method).toBe('POST')
        expect(JSON.parse(String(init?.body))).toEqual({
          guest: {
            type: 'api_id',
            api_id: 'gst-123'
          },
          event_api_id: 'evt-123',
          status: 'approved'
        })

        return createJsonResponse({})
      }

      throw new Error(`Unexpected fetch URL: ${url.toString()}`)
    })

    const result = await processApplicationLumaSyncQueueMessage(message, {
      database,
      runtimeConfig: {
        luma: {
          apiKey: 'luma_test_key',
          retryDelaySeconds: 90
        }
      },
      fetchImpl
    })

    expect(result).toEqual({
      messageId: 'msg_1',
      action: 'ack',
      reason: 'luma_sync_completed'
    })
    expect(message.ack).toHaveBeenCalledTimes(1)
    expect(message.retry).not.toHaveBeenCalled()

    const storedApplication = await database.query.userApplications.findFirst({
      where: eq(userApplications.id, 'application_1')
    })
    expect(storedApplication?.lumaSyncStatus).toBe('approve_synced')

    const auditRows = await database.select().from(auditLogs)
    expect(auditRows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        entityType: 'user_application',
        entityId: 'application_1',
        action: 'user_application.luma_sync_completed',
        metadata: expect.objectContaining({
          decision: 'approved',
          eventApiId: 'evt-123',
          guestId: 'gst-123',
          guestEmail: 'regular@example.com',
          lumaEmail: 'regular@example.com'
        })
      })
    ]))

    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  test('resolveLumaEmailFromUsername resolves the legacy Luma email from the hackathon event guest list', async () => {
    const fetchImpl = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url)

      if (url.pathname === '/user/bpirvu') {
        expect(init).toEqual(expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'accept': 'text/html',
            'user-agent': expect.stringContaining('Mozilla/5.0')
          })
        }))
        return createHtmlResponse('<script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{"user":{"username":"bpirvu","api_id":"usr-123"}}}}</script>')
      }

      if (url.pathname === '/v1/event/get-guests') {
        return createJsonResponse({
          entries: [
            {
              guest: {
                id: 'gst-123',
                user_id: 'usr-123',
                user_email: 'legacy-luma@example.com'
              }
            }
          ],
          has_more: false
        })
      }

      throw new Error(`Unexpected fetch URL: ${url.toString()}`)
    })

    await expect(resolveLumaEmailFromUsername({
      lumaEventApiId: 'evt-123',
      lumaUsername: 'bpirvu'
    }, {
      runtimeConfig: {
        luma: {
          apiKey: 'luma_test_key'
        }
      },
      fetchImpl
    })).resolves.toEqual({
      eventApiId: 'evt-123',
      guestId: 'gst-123',
      guestEmail: 'legacy-luma@example.com',
      lumaUserApiId: 'usr-123'
    })
  })

  test('queue message processing preserves the global fetch binding when no fetch implementation is injected', async () => {
    const { d1Database, database } = await seedLumaSyncContext()
    d1Databases.push(d1Database)
    const message = createQueueMessage()
    const fetchMock = vi.fn(function (this: unknown, input: string | URL | Request, init?: RequestInit) {
      expect(this).toBe(globalThis)

      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url)

      if (url.pathname === '/v1/event/get-guest') {
        expect(url.searchParams.get('id')).toBe('regular@example.com')
        return Promise.resolve(createJsonResponse({
          guest: {
            id: 'gst-123',
            user_email: 'regular@example.com'
          }
        }))
      }

      if (url.pathname === '/v1/event/update-guest-status') {
        expect(init?.method).toBe('POST')
        return Promise.resolve(createJsonResponse({}))
      }

      return Promise.reject(new Error(`Unexpected fetch URL: ${url.toString()}`))
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await processApplicationLumaSyncQueueMessage(message, {
      database,
      runtimeConfig: {
        luma: {
          apiKey: 'luma_test_key',
          retryDelaySeconds: 90
        }
      }
    })

    expect(result).toEqual({
      messageId: 'msg_1',
      action: 'ack',
      reason: 'luma_sync_completed'
    })
    expect(message.ack).toHaveBeenCalledTimes(1)
    expect(message.retry).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  test('queue message processing stores reject_failed for non-retryable sync failures', async () => {
    const { d1Database, database } = await seedLumaSyncContext({
      decision: 'rejected'
    })
    d1Databases.push(d1Database)
    const message = createQueueMessage({
      body: buildApplicationLumaSyncQueueMessage({
        applicationId: 'application_1',
        decision: 'rejected'
      })
    })
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url)

      if (url.pathname === '/v1/event/get-guest') {
        return createJsonResponse({
          guest: null
        })
      }

      throw new Error(`Unexpected fetch URL: ${url.toString()}`)
    })

    const result = await processApplicationLumaSyncQueueMessage(message, {
      database,
      runtimeConfig: {
        luma: {
          apiKey: 'luma_test_key'
        }
      },
      fetchImpl
    })

    expect(result).toEqual({
      messageId: 'msg_1',
      action: 'ack',
      reason: 'luma_event_guest_not_found'
    })
    expect(message.ack).toHaveBeenCalledTimes(1)
    expect(message.retry).not.toHaveBeenCalled()

    const storedApplication = await database.query.userApplications.findFirst({
      where: eq(userApplications.id, 'application_1')
    })
    expect(storedApplication?.lumaSyncStatus).toBe('reject_failed')
  })

  test('queue message processing retries retryable failures without overwriting not_synced', async () => {
    const { d1Database, database } = await seedLumaSyncContext()
    d1Databases.push(d1Database)
    const message = createQueueMessage()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const fetchImpl = vi.fn(async () => {
      return new Response('rate limit', { status: 429 })
    })

    const result = await processApplicationLumaSyncQueueMessage(message, {
      database,
      runtimeConfig: {
        luma: {
          apiKey: 'luma_test_key',
          retryDelaySeconds: 90
        }
      },
      fetchImpl
    })

    expect(result).toEqual({
      messageId: 'msg_1',
      action: 'retry',
      reason: 'luma_request_retryable_status'
    })
    expect(message.retry).toHaveBeenCalledWith({ delaySeconds: 90 })
    expect(message.ack).not.toHaveBeenCalled()
    expect(consoleError).toHaveBeenCalledWith('Retryable Luma sync queue failure.', {
      messageId: 'msg_1',
      applicationId: 'application_1',
      decision: 'approved',
      attempts: 1,
      retryDelaySeconds: 90,
      reason: 'luma_request_retryable_status',
      details: {
        path: '/v1/event/get-guest',
        statusCode: 429,
        message: 'rate limit'
      }
    })

    const storedApplication = await database.query.userApplications.findFirst({
      where: eq(userApplications.id, 'application_1')
    })
    expect(storedApplication?.lumaSyncStatus).toBe('not_synced')

    const auditRows = await database.select().from(auditLogs)
    expect(auditRows).toEqual([])
    consoleError.mockRestore()
  })

  test('startup recovery re-enqueues stale not_synced Luma applications', async () => {
    const { d1Database, database } = await seedLumaSyncContext()
    d1Databases.push(d1Database)
    const send = vi.fn(async () => undefined)

    const result = await recoverStaleApplicationLumaSyncMessages({
      database,
      cloudflareEnv: {
        APPLICATION_LUMA_SYNC_QUEUE: { send }
      },
      runtimeConfig: {
        luma: {
          queueBinding: 'APPLICATION_LUMA_SYNC_QUEUE',
          queueName: 'codex-hackathons-application-luma-sync',
          retryDelaySeconds: 90
        }
      }
    })

    expect(result).toEqual({
      status: 'recovered',
      reason: 'stale_applications_reenqueued',
      recoveredCount: 1,
      applicationIds: ['application_1']
    })
    expect(send).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenCalledWith(expect.objectContaining({
      applicationId: 'application_1',
      decision: 'approved'
    }), {
      contentType: 'json'
    })

    const storedApplication = await database.query.userApplications.findFirst({
      where: eq(userApplications.id, 'application_1')
    })
    expect(storedApplication?.lumaSyncStatus).toBe('not_synced')
    expect(storedApplication?.updatedAt).not.toBe('2026-03-22T12:30:00.000Z')

    const auditRows = await database.select().from(auditLogs)
    expect(auditRows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        entityType: 'user_application',
        entityId: 'application_1',
        action: 'user_application.luma_sync_recovery_enqueued',
        metadata: expect.objectContaining({
          decision: 'approved',
          recoveryTrigger: 'startup',
          queueName: 'codex-hackathons-application-luma-sync'
        })
      })
    ]))
  })

  test('startup recovery only schedules one re-enqueue pass per isolate', async () => {
    const { d1Database, database } = await seedLumaSyncContext()
    d1Databases.push(d1Database)
    const send = vi.fn(async () => undefined)
    const options = {
      database,
      cloudflareEnv: {
        APPLICATION_LUMA_SYNC_QUEUE: { send }
      },
      runtimeConfig: {
        luma: {
          queueBinding: 'APPLICATION_LUMA_SYNC_QUEUE',
          queueName: 'codex-hackathons-application-luma-sync',
          retryDelaySeconds: 90
        }
      }
    }

    const firstPass = scheduleApplicationLumaSyncStartupRecovery(options)
    const secondPass = scheduleApplicationLumaSyncStartupRecovery(options)

    expect(firstPass).toBe(secondPass)
    await expect(firstPass).resolves.toEqual({
      status: 'recovered',
      reason: 'stale_applications_reenqueued',
      recoveredCount: 1,
      applicationIds: ['application_1']
    })
    expect(send).toHaveBeenCalledTimes(1)
  })

  test('queue batch processing skips unrelated queues', async () => {
    const message = createQueueMessage()
    const result = await processApplicationLumaSyncQueueBatch({
      queue: 'different-queue',
      messages: [message]
    }, {
      runtimeConfig: {
        luma: {
          queueName: 'codex-hackathons-application-luma-sync'
        }
      }
    })

    expect(result).toEqual({
      queue: 'different-queue',
      skipped: true,
      outcomes: []
    })
    expect(message.ack).not.toHaveBeenCalled()
    expect(message.retry).not.toHaveBeenCalled()
  })
})
