import type { H3Event } from 'h3'
import { getRequestHeader, setResponseHeader } from 'h3'

import { drizzle } from 'drizzle-orm/d1'

import * as schema from './schema'
import { ApiError } from '#server/http/api-error'

export type D1DatabaseBinding = Parameters<typeof drizzle>[0]
export type AppDatabase = ReturnType<typeof createDatabase>
export type AppDatabaseBatch = Parameters<AppDatabase['batch']>[0]

export const d1BookmarkHeader = 'x-d1-bookmark'

export type DatabaseConsistency = 'strong' | 'public-replica'
export type D1SessionConstraint = 'first-primary' | 'first-unconstrained'

export interface D1DatabaseSessionBinding {
  prepare: D1DatabaseBinding['prepare']
  batch: D1DatabaseBinding['batch']
  getBookmark: () => string | null
}

export interface AppDatabaseAccess {
  database: AppDatabase
  session: D1DatabaseSessionBinding
  consistency: DatabaseConsistency
  sessionStart: D1SessionConstraint | string
}

export interface StrongDatabaseAccessOptions {
  consistency?: 'strong'
}

type CloudflareEnv = Record<string, unknown> | undefined
type RuntimeConfigShape = {
  database?: {
    binding?: string
  }
}

type SessionCapableD1DatabaseBinding = D1DatabaseBinding & {
  withSession: (constraintOrBookmark?: D1SessionConstraint | string) => D1DatabaseSessionBinding
}

export function createDatabase(binding: D1DatabaseBinding) {
  return drizzle(binding, { schema })
}

const requestDatabaseAccess = new WeakMap<H3Event, AppDatabaseAccess>()
const injectedTestDatabases = new WeakMap<H3Event, AppDatabase>()
const emittedBookmarks = new WeakSet<H3Event>()

function isSessionCapableD1DatabaseBinding(binding: D1DatabaseBinding): binding is SessionCapableD1DatabaseBinding {
  return typeof binding === 'object'
    && binding !== null
    && 'withSession' in binding
    && typeof binding.withSession === 'function'
}

function createSessionDatabaseBinding(
  binding: D1DatabaseBinding,
  session: D1DatabaseSessionBinding
) {
  return {
    ...binding,
    prepare: (query: string) => session.prepare(query),
    batch: <T>(statements: Parameters<D1DatabaseBinding['batch']>[0]) => session.batch<T>(statements)
  } satisfies D1DatabaseBinding
}

function resolveIncomingBookmark(event: H3Event) {
  if (!event.node?.req) {
    return undefined
  }

  const bookmark = getRequestHeader(event, d1BookmarkHeader)?.trim()
  return bookmark || undefined
}

function resolveSessionStart(consistency: DatabaseConsistency, incomingBookmark?: string) {
  return incomingBookmark ?? (consistency === 'strong' ? 'first-primary' : 'first-unconstrained')
}

function createDatabaseAccessForConsistency(
  binding: D1DatabaseBinding,
  consistency: DatabaseConsistency,
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

  const sessionStart = resolveSessionStart(consistency, incomingBookmark)
  const session = binding.withSession(sessionStart)

  return {
    database: createDatabase(createSessionDatabaseBinding(binding, session)),
    session,
    consistency,
    sessionStart
  }
}

export function createDatabaseAccess(
  binding: D1DatabaseBinding,
  options: {
    incomingBookmark?: string
  } = {}
): AppDatabaseAccess {
  return createDatabaseAccessForConsistency(binding, 'strong', options.incomingBookmark)
}

export function createPublicReplicaDatabaseAccess(
  binding: D1DatabaseBinding,
  options: {
    incomingBookmark?: string
  } = {}
): AppDatabaseAccess {
  return createDatabaseAccessForConsistency(binding, 'public-replica', options.incomingBookmark)
}

export function resolveD1Binding(bindingName: string, cloudflareEnv?: CloudflareEnv, injectedBinding?: D1DatabaseBinding) {
  const envBinding = cloudflareEnv?.[bindingName]

  if (envBinding) {
    return envBinding as D1DatabaseBinding
  }

  if (injectedBinding) {
    return injectedBinding
  }

  throw new ApiError({
    statusCode: 500,
    code: 'database_binding_missing',
    message: `The Cloudflare D1 binding "${bindingName}" is not available on this request.`,
    details: { binding: bindingName }
  })
}

function getConfiguredBindingName(event: H3Event) {
  const eventRuntimeConfig = (event.context as H3Event['context'] & { runtimeConfig?: RuntimeConfigShape }).runtimeConfig
  const runtimeConfigGetter = (globalThis as { useRuntimeConfig?: (event: H3Event) => RuntimeConfigShape }).useRuntimeConfig

  return eventRuntimeConfig?.database?.binding ?? runtimeConfigGetter?.(event)?.database?.binding ?? 'DB'
}

export function getD1Binding(event: H3Event) {
  const cloudflareEnv = event.context.cloudflare?.env as CloudflareEnv
  return resolveD1Binding(getConfiguredBindingName(event), cloudflareEnv)
}

function isHttpRequest(event: H3Event) {
  return Boolean(event.node?.req || event.node?.res)
}

function getDatabaseAccessForConsistency(event: H3Event, consistency: DatabaseConsistency) {
  const existingAccess = requestDatabaseAccess.get(event)

  if (existingAccess) {
    if (consistency !== existingAccess.consistency) {
      throw new ApiError({
        statusCode: 500,
        code: 'database_consistency_conflict',
        message: 'A request cannot use more than one D1 consistency constraint.',
        details: {
          requested: consistency,
          active: existingAccess.consistency
        }
      })
    }

    return existingAccess
  }

  const access = consistency === 'public-replica'
    ? createPublicReplicaDatabaseAccess(getD1Binding(event), {
        incomingBookmark: resolveIncomingBookmark(event)
      })
    : createDatabaseAccess(getD1Binding(event), {
        incomingBookmark: resolveIncomingBookmark(event)
      })
  requestDatabaseAccess.set(event, access)
  return access
}

export function getDatabaseAccess(event: H3Event, options?: StrongDatabaseAccessOptions) {
  return getDatabaseAccessForConsistency(event, options?.consistency ?? 'strong')
}

export function getPublicReplicaDatabase(event: H3Event) {
  return getDatabaseAccessForConsistency(event, 'public-replica').database
}

export function getDatabaseSession(event: H3Event, options?: StrongDatabaseAccessOptions) {
  return getDatabaseAccess(event, options).session
}

export function getDatabase(event: H3Event, options?: StrongDatabaseAccessOptions) {
  if (!isHttpRequest(event)) {
    const injectedDatabase = injectedTestDatabases.get(event)

    if (injectedDatabase) {
      return injectedDatabase
    }
  }

  return getDatabaseAccess(event, options).database
}

export function getDatabaseBookmark(event: H3Event) {
  return requestDatabaseAccess.get(event)?.session.getBookmark() ?? null
}

export function emitD1Bookmark(event: H3Event) {
  if (emittedBookmarks.has(event)) {
    return
  }

  const bookmark = getDatabaseBookmark(event)

  if (bookmark) {
    setResponseHeader(event, d1BookmarkHeader, bookmark)
    emittedBookmarks.add(event)
  }
}

export function setDatabase(event: H3Event, database: AppDatabase) {
  if (event.node?.req || event.node?.res) {
    throw new ApiError({
      statusCode: 500,
      code: 'database_injection_forbidden',
      message: 'Direct database injection is only available to non-HTTP test or infrastructure events.'
    })
  }

  injectedTestDatabases.set(event, database)
}

export async function withDatabaseBatch<T extends AppDatabaseBatch>(
  database: AppDatabase,
  batch: T
) {
  return await database.batch(batch)
}
