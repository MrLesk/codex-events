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

const dangerousBuilderCapabilities = new Set<PropertyKey>([
  '$client',
  'client',
  'constructor',
  '__proto__',
  'binding',
  'createSession',
  'getBookmark',
  'mapBatchResult',
  'prepare',
  'transaction',
  '_prepare',
  'session',
  'stmt',
  'withSession'
])

const facadeByTarget = new WeakMap<object, object>()
const targetByFacade = new WeakMap<object, object>()
const forwardedMethodsByTarget = new WeakMap<object, Map<PropertyKey, (...args: unknown[]) => unknown>>()
const safePrototypeByTarget = new WeakMap<object, object>()

function isObjectLike(value: unknown): value is object {
  return (typeof value === 'object' && value !== null) || typeof value === 'function'
}

function findPropertyDescriptor(target: object, property: PropertyKey) {
  let current: object | null = target

  while (current) {
    const descriptor = Reflect.getOwnPropertyDescriptor(current, property)
    if (descriptor) {
      return descriptor
    }
    current = Reflect.getPrototypeOf(current)
  }

  return undefined
}

function createSafeConstructorChain(rawConstructor: object, seen = new WeakMap<object, object>()): object {
  const existing = seen.get(rawConstructor)
  if (existing) {
    return existing
  }

  const rawParent = Object.getPrototypeOf(rawConstructor)
  const safeParent = typeof rawParent === 'function' && rawParent !== Function.prototype
    ? createSafeConstructorChain(rawParent, seen)
    : null
  const safeConstructor = Object.create(safeParent) as object
  const entityKindValue = Object.getOwnPropertyDescriptor(rawConstructor, entityKind)?.value

  if (typeof entityKindValue === 'string') {
    Object.defineProperty(safeConstructor, entityKind, {
      configurable: false,
      enumerable: false,
      value: entityKindValue,
      writable: false
    })
  }

  const frozen = Object.freeze(safeConstructor)
  seen.set(rawConstructor, frozen)
  return frozen
}

function getSafePrototype(target: object) {
  const existing = safePrototypeByTarget.get(target)
  if (existing) {
    return existing
  }

  const rawPrototype = Reflect.getPrototypeOf(target)
  const rawConstructor = rawPrototype
    ? Reflect.getOwnPropertyDescriptor(rawPrototype, 'constructor')?.value
    : undefined
  const safePrototype = Object.create(null) as object

  if (typeof rawConstructor === 'function') {
    Object.defineProperty(safePrototype, 'constructor', {
      configurable: false,
      enumerable: false,
      value: createSafeConstructorChain(rawConstructor),
      writable: false
    })
  }

  const frozen = Object.freeze(safePrototype)
  safePrototypeByTarget.set(target, frozen)
  return frozen
}

function isPlainObject(value: object) {
  const prototype = Reflect.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function unwrapRuntimeValue(value: unknown): unknown {
  if (isObjectLike(value)) {
    const target = targetByFacade.get(value)
    if (target) {
      return target
    }
  }

  if (Array.isArray(value)) {
    return value.map(unwrapRuntimeValue)
  }

  if (isObjectLike(value) && isPlainObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, unwrapRuntimeValue(entry)]))
  }

  return value
}

function hasDangerousBuilderCapability(value: object) {
  for (const capability of dangerousBuilderCapabilities) {
    if (capability !== 'constructor' && capability !== '__proto__' && findPropertyDescriptor(value, capability)) {
      return true
    }
  }

  return false
}

function wrapBuilderResult<T>(value: T): T {
  if (!isObjectLike(value)
    || typeof value !== 'object'
    || value instanceof Promise
    || Array.isArray(value)
    || isPlainObject(value)
    || !hasDangerousBuilderCapability(value)) {
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
    Reflect.apply(method, target, args.map(unwrapRuntimeValue))
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
      if (dangerousBuilderCapabilities.has(property) || typeof property === 'symbol') {
        return undefined
      }

      const descriptor = findPropertyDescriptor(target, property)
      if (!descriptor || !('value' in descriptor)) {
        return undefined
      }

      return typeof descriptor.value === 'function'
        ? getForwardedMethod(target, property, descriptor.value as (...args: unknown[]) => unknown)
        : descriptor.value
    },
    has(_facadeTarget, property) {
      const descriptor = findPropertyDescriptor(target, property)
      return !dangerousBuilderCapabilities.has(property)
        && typeof property !== 'symbol'
        && Boolean(descriptor && 'value' in descriptor)
    },
    ownKeys() {
      return Reflect.ownKeys(target).filter((property) => {
        if (dangerousBuilderCapabilities.has(property) || typeof property === 'symbol') {
          return false
        }
        const descriptor = Reflect.getOwnPropertyDescriptor(target, property)
        return Boolean(descriptor && 'value' in descriptor)
      })
    },
    getOwnPropertyDescriptor(_facadeTarget, property) {
      if (dangerousBuilderCapabilities.has(property) || typeof property === 'symbol') {
        return undefined
      }

      const descriptor = Reflect.getOwnPropertyDescriptor(target, property)
      if (!descriptor || !('value' in descriptor)) {
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
    getPrototypeOf: () => getSafePrototype(target),
    setPrototypeOf: () => false,
    preventExtensions: () => false
  })

  facadeByTarget.set(target, facade)
  targetByFacade.set(facade, target)
  return facade as T
}

function createQueryFacade(query: DrizzleDatabase['query']) {
  const facade = Object.create(null) as Record<string, unknown>

  for (const [tableName, relationalQuery] of Object.entries(query)) {
    Object.defineProperty(facade, tableName, {
      configurable: false,
      enumerable: true,
      value: wrapBuilderResult(relationalQuery),
      writable: false
    })
  }

  return Object.freeze(facade) as DrizzleDatabase['query']
}

function forwardRootMethod<K extends RootMethodCapability>(database: DrizzleDatabase, capability: K) {
  const method = database[capability] as unknown as (...args: unknown[]) => unknown
  return ((...args: unknown[]) => wrapBuilderResult(
    Reflect.apply(method, database, args.map(unwrapRuntimeValue))
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

  const frozenFacade = Object.freeze(facade)
  return new Proxy(frozenFacade, {
    get(target, property) {
      return Reflect.getOwnPropertyDescriptor(target, property)?.value
    },
    set: () => false,
    defineProperty: () => false
  }) as AppDatabase
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
