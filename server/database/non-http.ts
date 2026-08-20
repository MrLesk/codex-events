import type { H3Event } from 'h3'

import { drizzle, type DrizzleD1Database } from 'drizzle-orm/d1'
import { entityKind } from 'drizzle-orm/entity'

import * as schema from './schema'
import { ApiError } from '#server/http/api-error'

export type D1DatabaseBinding = Parameters<typeof drizzle>[0]
export type D1DatabaseClientBinding = Pick<D1DatabaseBinding, 'prepare' | 'batch'>

type DrizzleDatabase = DrizzleD1Database<typeof schema>

const supportedRootCapabilities = [
  'query',
  'select',
  'get',
  'insert',
  'update',
  'delete',
  'batch'
] as const

type SupportedRootCapability = typeof supportedRootCapabilities[number]
type RootMethodCapability = Exclude<SupportedRootCapability, 'query'>

export type AppDatabase = Pick<DrizzleDatabase, SupportedRootCapability>
export type AppDatabaseBatch = Parameters<AppDatabase['batch']>[0]

const blockedBuilderCapabilities = new Set<PropertyKey>(`
  $client client constructor __proto__ binding batch createSession getBookmark
  mapBatchResult prepare transaction _prepare session stmt withSession
  __defineGetter__ __defineSetter__ __lookupGetter__ __lookupSetter__
  hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf
`.trim().split(/\s+/u))
const safeBuilderDataCapabilities = new Set<PropertyKey>(['config', 'dialect'])
const safeResultCapabilities = new Set<PropertyKey>([
  'catch', 'execute', 'finally', 'getSelectedFields', 'getSQL', 'then', 'toSQL'
])

const supportedQueryTableNames = [
  'users',
  'mcpAccessTokens',
  'userAuthIdentities',
  'events',
  'eventTracks',
  'eventPhotos',
  'mediaCleanupOutbox',
  'eventFeedback',
  'eventRoleAssignments',
  'platformDocuments',
  'platformLegalSettings',
  'platformSettings',
  'userPlatformDocumentAcceptances',
  'eventTermsDocuments',
  'eventAttendeeEligibilities',
  'userApplications',
  'talkProposals',
  'teams',
  'teamMembers',
  'teamJoinRequests',
  'submissions',
  'evaluationCriteria',
  'judgeAssignments',
  'judgeCriterionScores',
  'prizes',
  'eventCreditOffers',
  'eventCreditCodes',
  'prizeEligibilitySnapshots',
  'prizeRedemptions',
  'eventOutcomeCaches',
  'eventOutcomeCacheEntries',
  'auditLogs'
] as const

const supportedQueryTableNameSet = new Set<string>(supportedQueryTableNames)

const facadeByTarget = new WeakMap<object, object>()
const targetByFacade = new WeakMap<object, object>()
const forwardedMethodsByTarget = new WeakMap<object, Map<PropertyKey, (...args: unknown[]) => unknown>>()
const safeBuilderConstructor = Object.freeze(Object.create(null, {
  [entityKind]: { configurable: false, enumerable: false, value: 'drizzle:SafeBuilder', writable: false }
}))
const safeBuilderPrototype = Object.freeze(Object.create(null, {
  constructor: { configurable: false, enumerable: false, value: safeBuilderConstructor, writable: false }
}))

function isObjectLike(value: unknown): value is object {
  return (typeof value === 'object' && value !== null) || typeof value === 'function'
}

function isPlainObject(value: object) {
  const prototype = Reflect.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function isSafeBuilderDataValue(target: object, value: unknown) {
  return !isObjectLike(value) || typeof value === 'function'
    || (value !== target && !facadeByTarget.has(value) && typeof Reflect.get(value, 'getSQL') === 'function')
}

function hasDangerousBuilderCapability(value: object) {
  return Object.prototype.hasOwnProperty.call(value, 'session')
    || Object.prototype.hasOwnProperty.call(value, '$client')
    || Object.prototype.hasOwnProperty.call(value, 'client')
}

function unwrapRuntimeValue(value: unknown, unwrapBuilderFacades = false): unknown {
  if (isObjectLike(value)) {
    const target = targetByFacade.get(value)
    if (target) {
      return unwrapBuilderFacades || !hasDangerousBuilderCapability(target) ? target : value
    }
  }

  if (unwrapBuilderFacades && Array.isArray(value)) {
    return value.map(entry => unwrapRuntimeValue(entry, unwrapBuilderFacades))
  }

  if (unwrapBuilderFacades && isObjectLike(value) && isPlainObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, unwrapRuntimeValue(entry, unwrapBuilderFacades)]))
  }

  return value
}

function wrapBuilderResult<T>(value: T, shouldWrap = true): T {
  if (!isObjectLike(value)
    || !shouldWrap
    || typeof value !== 'object'
    || value instanceof Promise
    || Array.isArray(value)
    || isPlainObject(value)
    || !hasDangerousBuilderCapability(value)
  ) {
    return value
  }

  const existingFacade = facadeByTarget.get(value)
  if (existingFacade) {
    return existingFacade as T
  }

  return createBuilderFacade(value) as T
}

function getForwardedMethod(target: object, property: PropertyKey, method: (...args: unknown[]) => unknown) {
  const methods = forwardedMethodsByTarget.get(target) ?? new Map<PropertyKey, (...args: unknown[]) => unknown>()
  const existing = methods.get(property)
  if (existing) {
    return existing
  }

  const forwarded = (...args: unknown[]) => wrapBuilderResult(
    Reflect.apply(method, target, args),
    !safeResultCapabilities.has(property)
  )
  methods.set(property, forwarded)
  forwardedMethodsByTarget.set(target, methods)
  return forwarded
}

function createBuilderFacade<T extends object>(target: T): T {
  const existingFacade = facadeByTarget.get(target)
  if (existingFacade) {
    return existingFacade as T
  }

  const facade = new Proxy(Object.create(null) as object, {
    get(_facadeTarget, property) {
      if (blockedBuilderCapabilities.has(property) || typeof property === 'symbol') {
        return undefined
      }

      const value = Reflect.get(target, property)
      if (typeof value === 'function') {
        return getForwardedMethod(target, property, value as (...args: unknown[]) => unknown)
      }

      return safeBuilderDataCapabilities.has(property) || isSafeBuilderDataValue(target, value)
        ? value
        : undefined
    },
    has(_facadeTarget, property) {
      if (blockedBuilderCapabilities.has(property) || typeof property === 'symbol') {
        return false
      }

      const value = Reflect.get(target, property)
      return typeof value === 'function'
        || safeBuilderDataCapabilities.has(property)
        || isSafeBuilderDataValue(target, value)
    },
    ownKeys() {
      return Reflect.ownKeys(target).filter((property) => {
        if (blockedBuilderCapabilities.has(property) || typeof property === 'symbol') {
          return false
        }
        const descriptor = Reflect.getOwnPropertyDescriptor(target, property)
        return Boolean(descriptor && 'value' in descriptor
          && (safeBuilderDataCapabilities.has(property) || isSafeBuilderDataValue(target, descriptor.value)))
      })
    },
    getOwnPropertyDescriptor(_facadeTarget, property) {
      if (blockedBuilderCapabilities.has(property) || typeof property === 'symbol') {
        return undefined
      }

      const descriptor = Reflect.getOwnPropertyDescriptor(target, property)
      if (!descriptor || !('value' in descriptor)
        || (!safeBuilderDataCapabilities.has(property) && !isSafeBuilderDataValue(target, descriptor.value))) {
        return undefined
      }

      return {
        configurable: true,
        enumerable: descriptor.enumerable,
        value: typeof descriptor.value === 'function'
          ? getForwardedMethod(target, property, descriptor.value as (...args: unknown[]) => unknown)
          : descriptor.value,
        writable: descriptor.writable
      }
    },
    set: () => false,
    defineProperty: () => false,
    deleteProperty: () => false,
    getPrototypeOf: () => safeBuilderPrototype,
    setPrototypeOf: () => false,
    preventExtensions: () => false
  })

  facadeByTarget.set(target, facade)
  targetByFacade.set(facade, target)
  return facade as T
}

function createQueryFacade(query: DrizzleDatabase['query']) {
  const tableFacades = new Map<string, object>()
  const getTableFacade = (tableName: string) => {
    const existing = tableFacades.get(tableName)
    if (existing) {
      return existing
    }

    const relationalQuery = (query as Record<string, object | undefined>)[tableName]
    if (!relationalQuery) {
      return undefined
    }

    const facade = createBuilderFacade(relationalQuery)
    tableFacades.set(tableName, facade)
    return facade
  }

  const facade = new Proxy(Object.create(null) as Record<string, unknown>, {
    get(_target, property) {
      return typeof property === 'string' && supportedQueryTableNameSet.has(property)
        ? getTableFacade(property)
        : undefined
    },
    has(_target, property) {
      return typeof property === 'string' && supportedQueryTableNameSet.has(property)
    },
    ownKeys() {
      return [...supportedQueryTableNames]
    },
    getOwnPropertyDescriptor(_target, property) {
      if (typeof property !== 'string' || !supportedQueryTableNameSet.has(property)) {
        return undefined
      }

      const value = getTableFacade(property)
      return value
        ? { configurable: true, enumerable: true, value, writable: false }
        : undefined
    },
    set: () => false,
    defineProperty: () => false,
    deleteProperty: () => false,
    getPrototypeOf: () => null
  })

  return facade as DrizzleDatabase['query']
}

function forwardRootMethod<K extends RootMethodCapability>(database: DrizzleDatabase, capability: K) {
  const method = database[capability] as unknown as (...args: unknown[]) => unknown
  return ((...args: unknown[]) => wrapBuilderResult(
    Reflect.apply(method, database, capability === 'batch'
      ? args.map(arg => unwrapRuntimeValue(arg, true))
      : args),
    capability !== 'get' && capability !== 'batch'
  )) as DrizzleDatabase[K]
}

function createApplicationDatabase(database: DrizzleDatabase): AppDatabase {
  const facade = Object.create(null) as Record<SupportedRootCapability, unknown>

  for (const capability of supportedRootCapabilities) {
    const value = capability === 'query'
      ? createQueryFacade(database.query)
      : forwardRootMethod(database, capability)

    Object.defineProperty(facade, capability, {
      configurable: false,
      enumerable: true,
      value,
      writable: false
    })
  }

  return Object.freeze(facade) as AppDatabase
}

function createD1DatabaseClientBinding(
  binding: D1DatabaseBinding | D1DatabaseClientBinding
): D1DatabaseClientBinding {
  return {
    prepare: (query: string) => binding.prepare(query),
    batch: <T>(statements: Parameters<D1DatabaseBinding['batch']>[0]) => binding.batch<T>(statements)
  }
}

function createDrizzleDatabase(binding: D1DatabaseClientBinding) {
  return drizzle<typeof schema, D1DatabaseBinding>(binding as D1DatabaseBinding, { schema })
}

export function createRequestDatabase(binding: D1DatabaseClientBinding): AppDatabase {
  return createApplicationDatabase(createDrizzleDatabase(binding))
}

export function createNonHttpDatabase(binding: D1DatabaseBinding | D1DatabaseClientBinding): AppDatabase {
  return createRequestDatabase(createD1DatabaseClientBinding(binding))
}

type CloudflareEnv = Record<string, unknown> | undefined

export function resolveNonHttpD1Binding(
  bindingName: string,
  cloudflareEnv?: CloudflareEnv,
  injectedBinding?: D1DatabaseBinding
) {
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

const testDatabases = new WeakMap<H3Event, AppDatabase>()

export function getTestDatabase(event: H3Event) {
  return testDatabases.get(event)
}

export function setTestDatabase(event: H3Event, database: AppDatabase) {
  if (event.node?.req || event.node?.res) {
    throw new ApiError({
      statusCode: 500,
      code: 'database_injection_forbidden',
      message: 'Direct database injection is only available to non-HTTP test or infrastructure events.'
    })
  }

  testDatabases.set(event, database)
}
