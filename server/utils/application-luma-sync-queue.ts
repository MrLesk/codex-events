import type { H3Event } from 'h3'

import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { writeAuditLog } from '../database/audit-log'
import { createDatabase, resolveD1Binding, type AppDatabase, type D1DatabaseBinding } from '../database/client'
import {
  hackathons,
  userApplications,
  users
} from '../database/schema'
import { isHackathonLumaSyncEnabled } from './applications'

export const defaultApplicationLumaSyncQueueBinding = 'APPLICATION_LUMA_SYNC_QUEUE'
export const defaultApplicationLumaSyncQueueName = 'codex-hackathons-application-luma-sync'
export const defaultApplicationLumaSyncRetryDelaySeconds = 120
export const defaultLumaApiBaseUrl = 'https://public-api.luma.com'
export const defaultLumaProfileBaseUrl = 'https://luma.com'
export const defaultLumaRequestUserAgent
  = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

const applicationLumaSyncRuntimeConfigSchema = z.object({
  database: z.object({
    binding: z.string().trim().optional()
  }).optional(),
  luma: z.object({
    apiKey: z.string().trim().optional(),
    apiBaseUrl: z.string().trim().optional(),
    profileBaseUrl: z.string().trim().optional(),
    queueBinding: z.string().trim().optional(),
    queueName: z.string().trim().optional(),
    retryDelaySeconds: z.coerce.number().int().nonnegative().optional()
  }).optional()
})

export const applicationLumaSyncQueueMessageSchema = z.object({
  applicationId: z.string().trim().min(1),
  decision: z.enum(['approved', 'rejected']),
  enqueuedAt: z.string().trim().min(1)
})

type ApplicationLumaSyncRuntimeConfig = z.infer<typeof applicationLumaSyncRuntimeConfigSchema>

export type ApplicationLumaSyncQueueMessage = z.infer<typeof applicationLumaSyncQueueMessageSchema>

export type ApplicationLumaSyncDecision = ApplicationLumaSyncQueueMessage['decision']

export type ApplicationLumaSyncStatus = typeof userApplications.$inferSelect['lumaSyncStatus']

export type ApplicationLumaSyncEnqueueResult = {
  status: 'enqueued'
} | {
  status: 'skipped'
  reason: string
} | {
  status: 'failed'
  reason: string
  errorMessage: string
}

export type ApplicationLumaSyncQueueMessageOutcome = {
  messageId: string
  action: 'ack' | 'retry'
  reason: string
}

interface QueueProducerLike {
  send: (message: unknown, options?: {
    contentType?: 'text' | 'json' | 'bytes' | 'v8'
    delaySeconds?: number
  }) => Promise<void>
}

interface QueueMessageLike<Body = unknown> {
  id: string
  body: Body
  attempts: number
  ack: () => void
  retry: (options?: { delaySeconds?: number }) => void
}

interface QueueBatchLike<Body = unknown> {
  queue: string
  messages: readonly QueueMessageLike<Body>[]
}

interface FetchLike {
  (input: string | URL | Request, init?: RequestInit): Promise<Response>
}

interface QueueDatabaseRecord {
  application: typeof userApplications.$inferSelect
  hackathon: typeof hackathons.$inferSelect | null
  user: typeof users.$inferSelect | null
}

class RetryableLumaSyncError extends Error {
  constructor(
    message: string,
    readonly details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'RetryableLumaSyncError'
  }
}

class PermanentLumaSyncError extends Error {
  constructor(
    message: string,
    readonly details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'PermanentLumaSyncError'
  }
}

function resolveQueueRuntimeConfig(event: H3Event): ApplicationLumaSyncRuntimeConfig {
  const eventRuntimeConfig = (event.context as H3Event['context'] & { runtimeConfig?: unknown }).runtimeConfig
  const runtimeConfigGetter = (globalThis as { useRuntimeConfig?: (event: H3Event) => unknown }).useRuntimeConfig
  const candidate = eventRuntimeConfig ?? runtimeConfigGetter?.(event) ?? {}
  const parsed = applicationLumaSyncRuntimeConfigSchema.safeParse(candidate)

  return parsed.success ? parsed.data : {}
}

function resolveQueueRuntimeConfigFromUnknown(candidate: unknown): ApplicationLumaSyncRuntimeConfig {
  const parsed = applicationLumaSyncRuntimeConfigSchema.safeParse(candidate)

  return parsed.success ? parsed.data : {}
}

function isQueueProducerLike(value: unknown): value is QueueProducerLike {
  if (!value || typeof value !== 'object') {
    return false
  }

  return typeof (value as Partial<QueueProducerLike>).send === 'function'
}

function getQueueBindingName(config: ApplicationLumaSyncRuntimeConfig) {
  return config.luma?.queueBinding?.trim() || defaultApplicationLumaSyncQueueBinding
}

function getQueueName(config: ApplicationLumaSyncRuntimeConfig) {
  return config.luma?.queueName?.trim() || defaultApplicationLumaSyncQueueName
}

function getRetryDelaySeconds(config: ApplicationLumaSyncRuntimeConfig) {
  return config.luma?.retryDelaySeconds ?? defaultApplicationLumaSyncRetryDelaySeconds
}

function getLumaApiKey(config: ApplicationLumaSyncRuntimeConfig) {
  return config.luma?.apiKey?.trim() || ''
}

function getLumaApiBaseUrl(config: ApplicationLumaSyncRuntimeConfig) {
  return config.luma?.apiBaseUrl?.trim() || defaultLumaApiBaseUrl
}

function getLumaProfileBaseUrl(config: ApplicationLumaSyncRuntimeConfig) {
  return config.luma?.profileBaseUrl?.trim() || defaultLumaProfileBaseUrl
}

function getDatabaseBindingName(config: ApplicationLumaSyncRuntimeConfig) {
  return config.database?.binding?.trim() || 'DB'
}

async function readResponseBody(response: Response) {
  const text = await response.text()

  if (!text) {
    return {
      raw: '',
      json: null as unknown
    }
  }

  try {
    return {
      raw: text,
      json: JSON.parse(text) as unknown
    }
  } catch {
    return {
      raw: text,
      json: null as unknown
    }
  }
}

function getErrorMessageFromPayload(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  if (typeof (payload as { message?: unknown }).message === 'string') {
    return (payload as { message: string }).message
  }

  if (typeof (payload as { error?: unknown }).error === 'string') {
    return (payload as { error: string }).error
  }

  return null
}

async function requestLumaJson(
  path: string,
  options: {
    config: ApplicationLumaSyncRuntimeConfig
    fetchImpl: FetchLike
    query?: Record<string, string | null | undefined>
    method?: 'GET' | 'POST'
    body?: unknown
  }
) {
  const url = new URL(path, `${getLumaApiBaseUrl(options.config).replace(/\/$/, '')}/`)

  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (typeof value === 'string' && value.length > 0) {
      url.searchParams.set(key, value)
    }
  }

  const requestInit: RequestInit = {
    method: options.method ?? 'GET',
    headers: {
      'accept': 'application/json',
      'user-agent': defaultLumaRequestUserAgent,
      'x-luma-api-key': getLumaApiKey(options.config)
    }
  }

  if (options.body !== undefined) {
    requestInit.headers = {
      ...requestInit.headers,
      'content-type': 'application/json'
    }
    requestInit.body = JSON.stringify(options.body)
  }

  let response: Response

  try {
    response = await options.fetchImpl(url.toString(), requestInit)
  } catch (error) {
    throw new RetryableLumaSyncError('luma_request_transport_error', {
      path,
      message: error instanceof Error ? error.message : 'Unexpected transport error'
    })
  }

  const body = await readResponseBody(response)

  if (!response.ok) {
    const message = getErrorMessageFromPayload(body.json)
      || body.raw
      || response.statusText
      || 'Luma request failed'

    if (response.status === 429 || response.status >= 500) {
      throw new RetryableLumaSyncError('luma_request_retryable_status', {
        path,
        statusCode: response.status,
        message
      })
    }

    throw new PermanentLumaSyncError('luma_request_failed', {
      path,
      statusCode: response.status,
      message
    })
  }

  if (body.json === null) {
    throw new RetryableLumaSyncError('luma_request_invalid_json', {
      path
    })
  }

  return body.json
}

async function requestLumaProfileHtml(
  username: string,
  options: {
    config: ApplicationLumaSyncRuntimeConfig
    fetchImpl: FetchLike
  }
) {
  const url = new URL(`/user/${encodeURIComponent(username)}`, `${getLumaProfileBaseUrl(options.config).replace(/\/$/, '')}/`)

  let response: Response

  try {
    response = await options.fetchImpl(url.toString(), {
      method: 'GET',
      headers: {
        'accept': 'text/html',
        'user-agent': defaultLumaRequestUserAgent
      }
    })
  } catch (error) {
    throw new RetryableLumaSyncError('luma_profile_transport_error', {
      username,
      message: error instanceof Error ? error.message : 'Unexpected transport error'
    })
  }

  const html = await response.text()

  if (!response.ok) {
    if (response.status === 429 || response.status >= 500) {
      throw new RetryableLumaSyncError('luma_profile_retryable_status', {
        username,
        statusCode: response.status
      })
    }

    throw new PermanentLumaSyncError('luma_profile_lookup_failed', {
      username,
      statusCode: response.status
    })
  }

  return html
}

function normalizeLumaUsername(value: string) {
  return value.trim().replace(/^@/, '').toLowerCase()
}

function extractNextDataJson(html: string) {
  const match = html.match(/<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i)

  if (!match?.[1]) {
    throw new PermanentLumaSyncError('luma_profile_next_data_missing')
  }

  try {
    return JSON.parse(match[1]) as unknown
  } catch {
    throw new PermanentLumaSyncError('luma_profile_next_data_invalid')
  }
}

function findLumaUserApiId(value: unknown, normalizedUsername: string): string | null {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const apiId = findLumaUserApiId(entry, normalizedUsername)

      if (apiId) {
        return apiId
      }
    }

    return null
  }

  if (!value || typeof value !== 'object') {
    return null
  }

  const candidate = value as Record<string, unknown>
  const username = typeof candidate.username === 'string'
    ? normalizeLumaUsername(candidate.username)
    : null
  const apiId = typeof candidate.api_id === 'string'
    ? candidate.api_id
    : null

  if (username === normalizedUsername && apiId?.startsWith('usr-')) {
    return apiId
  }

  for (const nestedValue of Object.values(candidate)) {
    const nestedApiId = findLumaUserApiId(nestedValue, normalizedUsername)

    if (nestedApiId) {
      return nestedApiId
    }
  }

  return null
}

async function resolveLumaUserApiId(
  username: string,
  options: {
    config: ApplicationLumaSyncRuntimeConfig
    fetchImpl: FetchLike
  }
) {
  const html = await requestLumaProfileHtml(username, options)
  const nextData = extractNextDataJson(html)
  const apiId = findLumaUserApiId(nextData, normalizeLumaUsername(username))

  if (!apiId) {
    throw new PermanentLumaSyncError('luma_profile_user_api_id_missing', {
      username
    })
  }

  return apiId
}

async function resolveLumaEventApiId(
  lumaEventUrl: string,
  options: {
    config: ApplicationLumaSyncRuntimeConfig
    fetchImpl: FetchLike
  }
) {
  const payload = await requestLumaJson('/v1/calendar/lookup-event', {
    config: options.config,
    fetchImpl: options.fetchImpl,
    query: {
      platform: 'luma',
      url: lumaEventUrl
    }
  }) as {
    event?: {
      api_id?: string | null
    } | null
  }

  const eventApiId = payload.event?.api_id?.trim()

  if (!eventApiId) {
    throw new PermanentLumaSyncError('luma_event_not_found', {
      lumaEventUrl
    })
  }

  return eventApiId
}

async function findGuestByLumaUserId(
  eventApiId: string,
  lumaUserApiId: string,
  options: {
    config: ApplicationLumaSyncRuntimeConfig
    fetchImpl: FetchLike
  }
) {
  let cursor: string | null = null

  while (true) {
    const payload = await requestLumaJson('/v1/event/get-guests', {
      config: options.config,
      fetchImpl: options.fetchImpl,
      query: {
        event_id: eventApiId,
        pagination_cursor: cursor,
        pagination_limit: '100'
      }
    }) as {
      entries?: Array<{
        guest?: {
          id?: string
          user_id?: string
          user_email?: string
        }
      }>
      has_more?: boolean
      next_cursor?: string
    }

    const matchingEntry = payload.entries?.find(entry => entry.guest?.user_id === lumaUserApiId)

    if (matchingEntry?.guest?.id && matchingEntry.guest.user_email) {
      return {
        guestId: matchingEntry.guest.id,
        guestEmail: matchingEntry.guest.user_email
      }
    }

    if (!payload.has_more || !payload.next_cursor) {
      break
    }

    cursor = payload.next_cursor
  }

  throw new PermanentLumaSyncError('luma_event_guest_not_found', {
    eventApiId,
    lumaUserApiId
  })
}

async function updateLumaGuestStatus(
  input: {
    eventApiId: string
    guestId: string
    decision: ApplicationLumaSyncDecision
  },
  options: {
    config: ApplicationLumaSyncRuntimeConfig
    fetchImpl: FetchLike
  }
) {
  await requestLumaJson('/v1/event/update-guest-status', {
    config: options.config,
    fetchImpl: options.fetchImpl,
    method: 'POST',
    body: {
      guest: {
        type: 'api_id',
        api_id: input.guestId
      },
      event_api_id: input.eventApiId,
      status: input.decision === 'approved' ? 'approved' : 'declined'
    }
  })
}

async function getQueueRecord(database: AppDatabase, applicationId: string): Promise<QueueDatabaseRecord | null> {
  const application = await database.query.userApplications.findFirst({
    where: eq(userApplications.id, applicationId)
  })

  if (!application) {
    return null
  }

  const [hackathon, user] = await Promise.all([
    database.query.hackathons.findFirst({
      where: eq(hackathons.id, application.hackathonId)
    }),
    database.query.users.findFirst({
      where: eq(users.id, application.userId)
    })
  ])

  return {
    application,
    hackathon: hackathon ?? null,
    user: user ?? null
  }
}

async function setApplicationLumaSyncStatus(
  database: AppDatabase,
  applicationId: string,
  status: ApplicationLumaSyncStatus
) {
  const updatedAt = new Date().toISOString()

  await database
    .update(userApplications)
    .set({
      lumaSyncStatus: status,
      updatedAt
    })
    .where(eq(userApplications.id, applicationId))

  return updatedAt
}

async function resolveProcessingDatabase(options: {
  database?: AppDatabase
  cloudflareEnv?: Record<string, unknown>
  runtimeConfig?: unknown
  d1Database?: D1DatabaseBinding
}) {
  if (options.database) {
    return options.database
  }

  const config = resolveQueueRuntimeConfigFromUnknown(options.runtimeConfig ?? {})
  const binding = resolveD1Binding(
    getDatabaseBindingName(config),
    options.cloudflareEnv,
    options.d1Database
  )

  return createDatabase(binding)
}

async function recordTerminalLumaSyncOutcome(
  database: AppDatabase,
  input: {
    applicationId: string
    status: ApplicationLumaSyncStatus
    action: 'user_application.luma_sync_completed' | 'user_application.luma_sync_failed'
    metadata: Record<string, unknown>
  }
) {
  const updatedAt = await setApplicationLumaSyncStatus(database, input.applicationId, input.status)

  await writeAuditLog(database, {
    entityType: 'user_application',
    entityId: input.applicationId,
    action: input.action,
    createdAt: updatedAt,
    metadata: input.metadata
  })
}

export function getApplicationLumaSyncSuccessStatus(decision: ApplicationLumaSyncDecision) {
  return decision === 'approved' ? 'approve_synced' : 'reject_synced'
}

export function getApplicationLumaSyncFailureStatus(decision: ApplicationLumaSyncDecision) {
  return decision === 'approved' ? 'approve_failed' : 'reject_failed'
}

export function buildApplicationLumaSyncQueueMessage(
  input: Pick<ApplicationLumaSyncQueueMessage, 'applicationId' | 'decision'>
): ApplicationLumaSyncQueueMessage {
  return {
    ...input,
    enqueuedAt: new Date().toISOString()
  }
}

export function getApplicationLumaSyncQueueProducer(event: H3Event) {
  const config = resolveQueueRuntimeConfig(event)
  const bindingName = getQueueBindingName(config)
  const cloudflareEnv = event.context.cloudflare?.env as Record<string, unknown> | undefined
  const producerCandidate = cloudflareEnv?.[bindingName]

  if (isQueueProducerLike(producerCandidate)) {
    return {
      producer: producerCandidate,
      bindingName
    }
  }

  return {
    producer: null,
    bindingName
  }
}

export async function enqueueApplicationLumaSyncMessage(
  event: H3Event,
  messageInput: ApplicationLumaSyncQueueMessage
): Promise<ApplicationLumaSyncEnqueueResult> {
  const parsedMessage = applicationLumaSyncQueueMessageSchema.safeParse(messageInput)

  if (!parsedMessage.success) {
    return {
      status: 'skipped',
      reason: 'queue_message_invalid'
    }
  }

  const { producer, bindingName } = getApplicationLumaSyncQueueProducer(event)

  if (!producer) {
    return {
      status: 'skipped',
      reason: `queue_binding_missing:${bindingName}`
    }
  }

  try {
    await producer.send(parsedMessage.data, {
      contentType: 'json'
    })
  } catch (error) {
    return {
      status: 'failed',
      reason: 'queue_send_error',
      errorMessage: error instanceof Error ? error.message : 'Unexpected queue send error'
    }
  }

  return {
    status: 'enqueued'
  }
}

export async function processApplicationLumaSyncQueueMessage(
  message: QueueMessageLike,
  options?: {
    runtimeConfig?: unknown
    cloudflareEnv?: Record<string, unknown>
    d1Database?: D1DatabaseBinding
    database?: AppDatabase
    fetchImpl?: FetchLike
  }
): Promise<ApplicationLumaSyncQueueMessageOutcome> {
  const parsedMessage = applicationLumaSyncQueueMessageSchema.safeParse(message.body)

  if (!parsedMessage.success) {
    message.ack()

    return {
      messageId: message.id,
      action: 'ack',
      reason: 'queue_message_invalid'
    }
  }

  const config = resolveQueueRuntimeConfigFromUnknown(options?.runtimeConfig ?? {})
  const database = await resolveProcessingDatabase({
    database: options?.database,
    runtimeConfig: options?.runtimeConfig,
    cloudflareEnv: options?.cloudflareEnv,
    d1Database: options?.d1Database
  })
  const fetchImpl = options?.fetchImpl ?? fetch
  const queueRecord = await getQueueRecord(database, parsedMessage.data.applicationId)

  if (!queueRecord) {
    message.ack()

    return {
      messageId: message.id,
      action: 'ack',
      reason: 'application_missing'
    }
  }

  const { application, hackathon, user } = queueRecord
  const failureStatus = getApplicationLumaSyncFailureStatus(parsedMessage.data.decision)
  const successStatus = getApplicationLumaSyncSuccessStatus(parsedMessage.data.decision)

  if (!hackathon || !user) {
    await recordTerminalLumaSyncOutcome(database, {
      applicationId: application.id,
      status: failureStatus,
      action: 'user_application.luma_sync_failed',
      metadata: {
        decision: parsedMessage.data.decision,
        reason: !hackathon ? 'hackathon_missing' : 'user_missing'
      }
    })
    message.ack()

    return {
      messageId: message.id,
      action: 'ack',
      reason: !hackathon ? 'hackathon_missing' : 'user_missing'
    }
  }

  if (!isHackathonLumaSyncEnabled(hackathon)) {
    await setApplicationLumaSyncStatus(database, application.id, null)
    message.ack()

    return {
      messageId: message.id,
      action: 'ack',
      reason: 'luma_sync_not_enabled'
    }
  }

  const lumaUsername = user.lumaUsername?.trim()

  if (!lumaUsername) {
    await recordTerminalLumaSyncOutcome(database, {
      applicationId: application.id,
      status: failureStatus,
      action: 'user_application.luma_sync_failed',
      metadata: {
        decision: parsedMessage.data.decision,
        reason: 'luma_username_missing'
      }
    })
    message.ack()

    return {
      messageId: message.id,
      action: 'ack',
      reason: 'luma_username_missing'
    }
  }

  if (!getLumaApiKey(config)) {
    await recordTerminalLumaSyncOutcome(database, {
      applicationId: application.id,
      status: failureStatus,
      action: 'user_application.luma_sync_failed',
      metadata: {
        decision: parsedMessage.data.decision,
        reason: 'luma_api_key_missing'
      }
    })
    message.ack()

    return {
      messageId: message.id,
      action: 'ack',
      reason: 'luma_api_key_missing'
    }
  }

  try {
    const lumaUserApiId = await resolveLumaUserApiId(lumaUsername, {
      config,
      fetchImpl
    })
    const eventApiId = await resolveLumaEventApiId(hackathon.lumaEventUrl!.trim(), {
      config,
      fetchImpl
    })
    const { guestId, guestEmail } = await findGuestByLumaUserId(eventApiId, lumaUserApiId, {
      config,
      fetchImpl
    })

    await updateLumaGuestStatus({
      eventApiId,
      guestId,
      decision: parsedMessage.data.decision
    }, {
      config,
      fetchImpl
    })

    await recordTerminalLumaSyncOutcome(database, {
      applicationId: application.id,
      status: successStatus,
      action: 'user_application.luma_sync_completed',
      metadata: {
        decision: parsedMessage.data.decision,
        eventApiId,
        guestId,
        guestEmail,
        lumaUserApiId,
        lumaUsername
      }
    })

    message.ack()

    return {
      messageId: message.id,
      action: 'ack',
      reason: 'luma_sync_completed'
    }
  } catch (error) {
    if (error instanceof RetryableLumaSyncError) {
      message.retry({
        delaySeconds: getRetryDelaySeconds(config)
      })

      return {
        messageId: message.id,
        action: 'retry',
        reason: error.message
      }
    }

    const errorDetails = error instanceof PermanentLumaSyncError
      ? error.details
      : {
          message: error instanceof Error ? error.message : 'Unexpected Luma sync error'
        }

    await recordTerminalLumaSyncOutcome(database, {
      applicationId: application.id,
      status: failureStatus,
      action: 'user_application.luma_sync_failed',
      metadata: {
        decision: parsedMessage.data.decision,
        reason: error instanceof PermanentLumaSyncError ? error.message : 'luma_sync_unexpected_error',
        ...(errorDetails ?? {})
      }
    })

    message.ack()

    return {
      messageId: message.id,
      action: 'ack',
      reason: error instanceof PermanentLumaSyncError ? error.message : 'luma_sync_unexpected_error'
    }
  }
}

export async function processApplicationLumaSyncQueueBatch(
  batch: QueueBatchLike,
  options?: {
    runtimeConfig?: unknown
    cloudflareEnv?: Record<string, unknown>
    d1Database?: D1DatabaseBinding
    database?: AppDatabase
    fetchImpl?: FetchLike
  }
) {
  const config = resolveQueueRuntimeConfigFromUnknown(options?.runtimeConfig ?? {})

  if (batch.queue !== getQueueName(config)) {
    return {
      queue: batch.queue,
      skipped: true,
      outcomes: [] as ApplicationLumaSyncQueueMessageOutcome[]
    }
  }

  const outcomes: ApplicationLumaSyncQueueMessageOutcome[] = []

  for (const message of batch.messages) {
    outcomes.push(await processApplicationLumaSyncQueueMessage(message, options))
  }

  return {
    queue: batch.queue,
    skipped: false,
    outcomes
  }
}
