import type { H3Event } from 'h3'

import { drizzle, type DrizzleD1Database } from 'drizzle-orm/d1'

import * as schema from './schema'
import { ApiError } from '#server/http/api-error'

export type D1DatabaseBinding = Parameters<typeof drizzle>[0]
export type D1DatabaseClientBinding = Pick<D1DatabaseBinding, 'prepare' | 'batch'>

type DrizzleDatabase = DrizzleD1Database<typeof schema>

type DeniedRootCapability
  = | '$client'
    | 'client'
    | 'constructor'
    | 'getBookmark'
    | 'prepare'
    | '_prepare'
    | 'session'
    | 'stmt'
    | 'withSession'

// Runtime denies capabilities; Drizzle chain methods remain inferred.
export type AppDatabase = Omit<DrizzleDatabase, DeniedRootCapability>
export type AppDatabaseBatch = Parameters<AppDatabase['batch']>[0]

const deniedCapabilities = new Set<PropertyKey>([
  '$client',
  'client',
  'constructor',
  'getBookmark',
  'prepare',
  '_prepare',
  'session',
  'stmt',
  'withSession'
])

const facadeByTarget = new WeakMap<object, object>()
const targetByFacade = new WeakMap<object, object>()
const safePrototypeByTarget = new WeakMap<object, object>()

function isObjectLike(value: unknown): value is object {
  return typeof value === 'object' && value !== null
}

function getSafePrototype(target: object) {
  const safePrototype = safePrototypeByTarget.get(target) ?? (Object.create(null) as object)
  safePrototypeByTarget.set(target, safePrototype)
  return safePrototype
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

  if (isObjectLike(value)) {
    const prototype = Object.getPrototypeOf(value)
    if (prototype === Object.prototype || prototype === null) {
      return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, unwrapRuntimeValue(entry)]))
    }
  }

  return value
}

function wrapRuntimeValue<T>(value: T): T {
  if (!isObjectLike(value) || value instanceof Promise || Array.isArray(value)) {
    return value
  }

  const existingFacade = facadeByTarget.get(value)
  if (existingFacade) {
    return existingFacade as T
  }

  const facade = new Proxy(value, {
    get(target, property) {
      if (deniedCapabilities.has(property)) {
        return undefined
      }

      const propertyValue = Reflect.get(target, property, target)
      if (typeof propertyValue !== 'function') {
        return wrapRuntimeValue(propertyValue)
      }

      const method = propertyValue as (...args: unknown[]) => unknown
      return (...args: unknown[]) => {
        if (property === 'transaction') {
          const callback = args[0]
          const wrappedCallback = typeof callback === 'function'
            ? (transaction: object) => unwrapRuntimeValue(Reflect.apply(
                callback as (...callbackArgs: unknown[]) => unknown,
                undefined,
                [wrapRuntimeValue(transaction)]
              ))
            : callback

          return wrapRuntimeValue(Reflect.apply(method, target, [
            wrappedCallback,
            ...args.slice(1).map(unwrapRuntimeValue)
          ]))
        }

        return wrapRuntimeValue(Reflect.apply(method, target, args.map(unwrapRuntimeValue)))
      }
    },
    has(target, property) {
      return !deniedCapabilities.has(property) && Reflect.has(target, property)
    },
    ownKeys(target) {
      return Reflect.ownKeys(target).filter(property => !deniedCapabilities.has(property))
    },
    getOwnPropertyDescriptor(target, property) {
      if (deniedCapabilities.has(property)) {
        return undefined
      }

      return Reflect.getOwnPropertyDescriptor(target, property)
    },
    set(target, property, nextValue) {
      return !deniedCapabilities.has(property)
        && Reflect.set(target, property, unwrapRuntimeValue(nextValue), target)
    },
    defineProperty(target, property, descriptor) {
      return !deniedCapabilities.has(property) && Reflect.defineProperty(target, property, descriptor)
    },
    deleteProperty(target, property) {
      return !deniedCapabilities.has(property) && Reflect.deleteProperty(target, property)
    },
    getPrototypeOf: target => getSafePrototype(target),
    setPrototypeOf: () => false,
    preventExtensions: () => false
  })

  facadeByTarget.set(value, facade)
  targetByFacade.set(facade, value)
  return facade as T
}

function createApplicationDatabase(database: DrizzleDatabase): AppDatabase {
  return wrapRuntimeValue(database)
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
