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
import {
  finishRequestD1Execution,
  measureRequestPhaseSync,
  recordRequestDatabaseSession,
  startRequestD1Execution,
  type D1ExecutionApi,
  type D1ExecutionKind,
  type D1ExecutionObservation
} from '#server/http/request-timing'

export type { AppDatabase, AppDatabaseBatch } from './non-http'

export const d1BookmarkHeader = 'x-d1-bookmark'

type D1SessionConstraint = 'first-primary' | 'first-unconstrained'
type D1PreparedStatement = ReturnType<D1DatabaseBinding['prepare']>

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

function unknownD1ExecutionObservation(statementCount: number): D1ExecutionObservation {
  return {
    databaseDurationMs: 0,
    databaseDurationUnknownCount: statementCount,
    attempts: 0,
    attemptsUnknownCount: statementCount,
    servedByRegion: null,
    servedByColo: null,
    servedByPrimary: null
  }
}

function mergeMetadataString(current: string | null, next: string | null) {
  if (next === null) {
    return current
  }

  return current === null
    ? next
    : current === next
      ? current
      : 'mixed'
}

function readDatabaseDuration(result: unknown, statementCount: number, expectsResultMetadata: boolean): D1ExecutionObservation {
  if (!expectsResultMetadata) {
    return unknownD1ExecutionObservation(statementCount)
  }

  const results = Array.isArray(result) ? result : [result]
  let databaseDurationMs = 0
  let databaseDurationUnknownCount = Math.max(0, statementCount - results.length)
  let attempts = 0
  let attemptsUnknownCount = Math.max(0, statementCount - results.length)
  let servedByRegion: string | null = null
  let servedByColo: string | null = null
  let servedByPrimary: boolean | 'mixed' | null = null
  let servedByPrimaryMixed = false

  for (const entry of results) {
    const metadata = typeof entry === 'object' && entry !== null && 'meta' in entry
      ? (entry as { meta?: unknown }).meta
      : undefined
    const timings = typeof metadata === 'object' && metadata !== null && 'timings' in metadata
      ? (metadata as { timings?: unknown }).timings
      : undefined
    const sqlDuration = typeof timings === 'object' && timings !== null && 'sql_duration_ms' in timings
      ? (timings as { sql_duration_ms?: unknown }).sql_duration_ms
      : undefined
    const totalAttempts = typeof metadata === 'object' && metadata !== null && 'total_attempts' in metadata
      ? (metadata as { total_attempts?: unknown }).total_attempts
      : undefined
    const region = typeof metadata === 'object' && metadata !== null && 'served_by_region' in metadata
      ? (metadata as { served_by_region?: unknown }).served_by_region
      : undefined
    const colo = typeof metadata === 'object' && metadata !== null && 'served_by_colo' in metadata
      ? (metadata as { served_by_colo?: unknown }).served_by_colo
      : undefined
    const primary = typeof metadata === 'object' && metadata !== null && 'served_by_primary' in metadata
      ? (metadata as { served_by_primary?: unknown }).served_by_primary
      : undefined

    if (typeof sqlDuration === 'number' && Number.isFinite(sqlDuration)) {
      databaseDurationMs += Math.max(0, sqlDuration)
    } else {
      databaseDurationUnknownCount += 1
    }

    if (typeof totalAttempts === 'number' && Number.isFinite(totalAttempts)) {
      attempts += Math.max(0, Math.floor(totalAttempts))
    } else {
      attemptsUnknownCount += 1
    }

    servedByRegion = mergeMetadataString(servedByRegion, typeof region === 'string' ? region : null)
    servedByColo = mergeMetadataString(servedByColo, typeof colo === 'string' ? colo : null)

    if (typeof primary === 'boolean') {
      if (servedByPrimary === null) {
        servedByPrimary = primary
      } else if (servedByPrimary !== primary) {
        servedByPrimaryMixed = true
      }
    }
  }

  return {
    databaseDurationMs,
    databaseDurationUnknownCount,
    attempts,
    attemptsUnknownCount,
    servedByRegion,
    servedByColo,
    servedByPrimary: servedByPrimaryMixed ? 'mixed' : servedByPrimary
  }
}

async function measureD1Execution<T>(
  event: H3Event,
  api: D1ExecutionApi,
  kind: D1ExecutionKind,
  statementCount: number,
  expectsResultMetadata: boolean,
  operation: () => Promise<T>
) {
  const execution = startRequestD1Execution(event, api, kind, statementCount)

  try {
    const result = await operation()
    finishRequestD1Execution(event, execution, readDatabaseDuration(result, statementCount, expectsResultMetadata))
    return result
  } catch (error) {
    finishRequestD1Execution(event, execution, unknownD1ExecutionObservation(statementCount))
    throw error
  }
}

function createTimedPreparedStatement(
  event: H3Event,
  statement: D1PreparedStatement,
  rawStatementByTimedStatement: WeakMap<object, D1PreparedStatement>
): D1PreparedStatement {
  const bind = ((...parameters: unknown[]) => createTimedPreparedStatement(
    event,
    statement.bind(...parameters),
    rawStatementByTimedStatement
  )) as D1PreparedStatement['bind']
  const first = ((columnName?: string) => measureD1Execution(
    event,
    'prepare',
    'first',
    1,
    false,
    () => columnName === undefined ? statement.first() : statement.first(columnName)
  )) as D1PreparedStatement['first']
  const run = (() => measureD1Execution(
    event,
    'prepare',
    'run',
    1,
    true,
    () => statement.run()
  )) as D1PreparedStatement['run']
  const all = (() => measureD1Execution(
    event,
    'prepare',
    'all',
    1,
    true,
    () => statement.all()
  )) as D1PreparedStatement['all']
  const raw = ((options?: { columnNames?: boolean }) => measureD1Execution(
    event,
    'prepare',
    'raw',
    1,
    false,
    () => options === undefined ? statement.raw() : statement.raw(options)
  )) as D1PreparedStatement['raw']
  const timedStatement = Object.freeze({ bind, first, run, all, raw }) as D1PreparedStatement

  rawStatementByTimedStatement.set(timedStatement as object, statement)
  return timedStatement
}

function createTimedSessionDatabaseBinding(
  event: H3Event,
  session: D1DatabaseSessionBinding
): D1DatabaseSessionBinding {
  const rawStatementByTimedStatement = new WeakMap<object, D1PreparedStatement>()

  return {
    prepare: (query: string) => createTimedPreparedStatement(
      event,
      session.prepare(query),
      rawStatementByTimedStatement
    ),
    batch: async <T>(statements: Parameters<D1DatabaseBinding['batch']>[0]) => {
      const preparedStatements = statements as D1PreparedStatement[]
      const rawStatements = preparedStatements.map((statement) => {
        const rawStatement = rawStatementByTimedStatement.get(statement as object)

        if (!rawStatement) {
          throw new TypeError('D1 batch statements must come from the request-scoped session.')
        }

        return rawStatement
      })

      return await measureD1Execution(
        event,
        'batch',
        'batch',
        rawStatements.length,
        true,
        () => session.batch<T>(rawStatements)
      )
    },
    getBookmark: () => session.getBookmark()
  }
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
  event: H3Event,
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
  const session = createTimedSessionDatabaseBinding(event, binding.withSession(sessionStart))

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

  const access = measureRequestPhaseSync(event, 'database-session', () =>
    createStrongDatabaseAccess(event, getD1Binding(event), resolveIncomingBookmark(event))
  )
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
