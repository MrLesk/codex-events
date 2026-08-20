import type { H3Event } from 'h3'
import { getRequestHeader, setResponseHeader } from 'h3'

import {
  createRequestDatabase,
  getTestDatabase,
  type AppDatabase,
  type AppDatabaseBatch,
  type D1DatabaseBinding,
  type D1DatabaseClientBinding
} from './non-http'
import { ApiError } from '#server/http/api-error'
import { recordRequestDatabaseSession } from '#server/http/request-timing'

export type { AppDatabase, AppDatabaseBatch } from './non-http'

export const d1BookmarkHeader = 'x-d1-bookmark'

type D1SessionConstraint = 'first-primary' | 'first-unconstrained'

interface D1DatabaseSessionBinding {
  prepare: D1DatabaseBinding['prepare']
  batch: D1DatabaseBinding['batch']
  getBookmark: () => string | null
}

interface AppDatabaseAccess {
  database: AppDatabase
  session: D1DatabaseSessionBinding
  consistency: 'strong'
  sessionStart: D1SessionConstraint | string
}

type RuntimeConfigShape = {
  database?: {
    binding?: string
  }
}

type SessionCapableD1DatabaseBinding = D1DatabaseBinding & {
  withSession: (constraintOrBookmark?: D1SessionConstraint | string) => D1DatabaseSessionBinding
}

const requestDatabaseAccess = new WeakMap<H3Event, AppDatabaseAccess>()
const emittedBookmarks = new WeakSet<H3Event>()

function isSessionCapableD1DatabaseBinding(binding: D1DatabaseBinding): binding is SessionCapableD1DatabaseBinding {
  return typeof binding === 'object'
    && binding !== null
    && 'withSession' in binding
    && typeof binding.withSession === 'function'
}

function createSessionDatabaseBinding(
  session: D1DatabaseSessionBinding
): D1DatabaseClientBinding {
  return {
    prepare: (query: string) => session.prepare(query),
    batch: <T>(statements: Parameters<D1DatabaseBinding['batch']>[0]) => session.batch<T>(statements)
  }
}

function resolveIncomingBookmark(event: H3Event) {
  if (!event.node?.req) {
    return undefined
  }

  const bookmark = getRequestHeader(event, d1BookmarkHeader)?.trim()
  return bookmark || undefined
}

function resolveSessionStart(incomingBookmark?: string) {
  return incomingBookmark ?? 'first-primary'
}

function createStrongDatabaseAccess(
  binding: D1DatabaseBinding,
  incomingBookmark?: string
): AppDatabaseAccess {
  if (!isSessionCapableD1DatabaseBinding(binding)) {
    throw new ApiError({
      statusCode: 500,
      code: 'database_sessions_unavailable',
      message: 'The Cloudflare D1 binding does not support request-scoped sessions.',
      details: { binding: 'D1' }
    })
  }

  const sessionStart = resolveSessionStart(incomingBookmark)
  const session = binding.withSession(sessionStart)

  return {
    database: createRequestDatabase(createSessionDatabaseBinding(session)),
    session,
    consistency: 'strong',
    sessionStart
  }
}

function getConfiguredBindingName(event: H3Event) {
  const eventRuntimeConfig = (event.context as H3Event['context'] & { runtimeConfig?: RuntimeConfigShape }).runtimeConfig
  const runtimeConfigGetter = (globalThis as { useRuntimeConfig?: (event: H3Event) => RuntimeConfigShape }).useRuntimeConfig

  return eventRuntimeConfig?.database?.binding ?? runtimeConfigGetter?.(event)?.database?.binding ?? 'DB'
}

function getD1Binding(event: H3Event) {
  const cloudflareEnv = event.context.cloudflare?.env as Record<string, unknown> | undefined
  const bindingName = getConfiguredBindingName(event)
  const binding = cloudflareEnv?.[bindingName]

  if (!binding) {
    throw new ApiError({
      statusCode: 500,
      code: 'database_binding_missing',
      message: `The Cloudflare D1 binding "${bindingName}" is not available on this request.`,
      details: { binding: bindingName }
    })
  }

  return binding as D1DatabaseBinding
}

function isHttpRequest(event: H3Event) {
  return Boolean(event.node?.req || event.node?.res)
}

function getRequestDatabaseAccess(event: H3Event) {
  const existingAccess = requestDatabaseAccess.get(event)

  if (existingAccess) {
    return existingAccess
  }

  const access = createStrongDatabaseAccess(getD1Binding(event), resolveIncomingBookmark(event))
  recordRequestDatabaseSession(event, access.sessionStart)
  requestDatabaseAccess.set(event, access)
  return access
}

function getDatabaseAccess(event: H3Event) {
  return getRequestDatabaseAccess(event)
}

export function getDatabaseSession(event: H3Event) {
  return getDatabaseAccess(event).session
}

export function getDatabase(event: H3Event) {
  if (!isHttpRequest(event)) {
    const injectedDatabase = getTestDatabase(event)

    if (injectedDatabase) {
      return injectedDatabase
    }
  }

  return getDatabaseAccess(event).database
}

function getDatabaseBookmark(event: H3Event) {
  return requestDatabaseAccess.get(event)?.session.getBookmark() ?? null
}

export function emitD1Bookmark(event: H3Event) {
  if (emittedBookmarks.has(event)) {
    return false
  }

  const bookmark = getDatabaseBookmark(event)

  if (bookmark) {
    setResponseHeader(event, d1BookmarkHeader, bookmark)
    emittedBookmarks.add(event)
    return true
  }

  return false
}

export async function withDatabaseBatch<T extends AppDatabaseBatch>(
  database: AppDatabase,
  batch: T
) {
  return await database.batch(batch)
}
