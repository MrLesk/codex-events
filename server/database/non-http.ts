import type { H3Event } from 'h3'

import { drizzle, type DrizzleD1Database } from 'drizzle-orm/d1'

import * as schema from './schema'
import { ApiError } from '#server/http/api-error'

export type D1DatabaseBinding = Parameters<typeof drizzle>[0]

export type D1DatabaseClientBinding = Pick<D1DatabaseBinding, 'prepare' | 'batch'>

type DrizzleDatabase = DrizzleD1Database<typeof schema>

type ApplicationDatabaseKeys
  = | 'query'
    | '$with'
    | '$count'
    | 'with'
    | 'select'
    | 'selectDistinct'
    | 'update'
    | 'insert'
    | 'delete'
    | 'run'
    | 'all'
    | 'get'
    | 'values'
    | 'transaction'
    | 'batch'

export type AppDatabase = Pick<DrizzleDatabase, ApplicationDatabaseKeys>

export type AppDatabaseBatch = Parameters<AppDatabase['batch']>[0]

const hiddenRuntimeCapabilities = new Set<PropertyKey>([
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
const compatibilityPrototypeByTarget = new WeakMap<object, object>()
const drizzleEntityKind = Symbol.for('drizzle:entityKind')

function isObjectLike(value: unknown): value is object {
  return (typeof value === 'object' && value !== null) || typeof value === 'function'
}

function isNativePromise(value: object) {
  return value instanceof Promise
}

function isDatabaseTarget(value: object) {
  return Object.prototype.hasOwnProperty.call(value, 'query')
    && typeof Reflect.get(value, 'select', value) === 'function'
    && typeof Reflect.get(value, 'batch', value) === 'function'
}

function hasFunction(value: object, property: PropertyKey) {
  return typeof Reflect.get(value, property, value) === 'function'
}

function createCompatibilityPrototype(value: object) {
  const existingPrototype = compatibilityPrototypeByTarget.get(value)
  if (existingPrototype) {
    return existingPrototype
  }

  const rawPrototype = Object.getPrototypeOf(value)
  const rawConstructor = rawPrototype ? Reflect.get(rawPrototype, 'constructor') : undefined
  const rawConstructorChain: object[] = []
  const visitedConstructors = new Set<object>()
  let currentConstructor = isObjectLike(rawConstructor) ? rawConstructor : undefined

  while (currentConstructor && !visitedConstructors.has(currentConstructor)) {
    rawConstructorChain.push(currentConstructor)
    visitedConstructors.add(currentConstructor)
    const parentConstructor = Object.getPrototypeOf(currentConstructor)
    currentConstructor = parentConstructor && isObjectLike(parentConstructor)
      ? parentConstructor
      : undefined
  }

  let compatibilityConstructor: object | null = null
  for (let index = rawConstructorChain.length - 1; index >= 0; index -= 1) {
    const rawConstructorEntry = rawConstructorChain[index]
    if (!rawConstructorEntry) {
      continue
    }

    const nextConstructor: object = Object.create(compatibilityConstructor)
    const entityKind = Reflect.get(rawConstructorEntry, drizzleEntityKind)

    if (entityKind !== undefined) {
      Object.defineProperty(nextConstructor, drizzleEntityKind, {
        configurable: false,
        enumerable: false,
        value: entityKind,
        writable: false
      })
    }

    compatibilityConstructor = Object.freeze(nextConstructor)
  }

  const compatibilityPrototype = Object.freeze(Object.create(null, {
    constructor: {
      configurable: false,
      enumerable: false,
      value: compatibilityConstructor,
      writable: false
    }
  }))
  compatibilityPrototypeByTarget.set(value, compatibilityPrototype)
  return compatibilityPrototype
}

function isDrizzleCapabilityTarget(value: object) {
  if (isDatabaseTarget(value)) {
    return true
  }

  if (hasFunction(value, '_prepare')
    || hasFunction(value, 'execute')
    || hasFunction(value, 'findFirst')
    || hasFunction(value, 'findMany')) {
    return true
  }

  if (hasFunction(value, 'as')
    || hasFunction(value, 'select')
    || hasFunction(value, 'selectDistinct')
    || hasFunction(value, 'update')
    || hasFunction(value, 'insert')
    || hasFunction(value, 'delete')
    || hasFunction(value, 'from')
    || hasFunction(value, 'set')
    || hasFunction(value, 'where')
    || hasFunction(value, 'then')) {
    return true
  }

  return Object.prototype.hasOwnProperty.call(value, 'session')
    && (hasFunction(value, 'run') || hasFunction(value, 'transaction'))
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

  return value
}

function wrapRuntimeValue<T>(value: T, forceCapability = false): T {
  if (!isObjectLike(value)
    || isNativePromise(value)
    || Array.isArray(value)
    || (!forceCapability && !isDrizzleCapabilityTarget(value))) {
    return value
  }

  const existingFacade = facadeByTarget.get(value)
  if (existingFacade) {
    return existingFacade as T
  }

  const shell = Object.create(createCompatibilityPrototype(value)) as object
  const runtimeMethodOverrides = new Map<PropertyKey, (...args: unknown[]) => unknown>()
  const facade = new Proxy(shell, {
    get: (_target, property) => {
      if (hiddenRuntimeCapabilities.has(property)
        || (property === 'batch' && !isDatabaseTarget(value))) {
        return undefined
      }

      const runtimeMethodOverride = runtimeMethodOverrides.get(property)
      if (runtimeMethodOverride) {
        return runtimeMethodOverride
      }

      if (property === 'hasOwnProperty'
        || property === 'propertyIsEnumerable'
        || property === 'isPrototypeOf'
        || property === '__defineGetter__'
        || property === '__defineSetter__'
        || property === '__lookupGetter__'
        || property === '__lookupSetter__'
        || property === 'toLocaleString'
        || property === 'toString'
        || property === 'valueOf'
        || property === '__proto__') {
        const objectPrototypeValue = Reflect.get(Object.prototype, property, shell)
        return typeof objectPrototypeValue === 'function'
          ? (...args: unknown[]) => Reflect.apply(objectPrototypeValue, shell, args.map(unwrapRuntimeValue))
          : objectPrototypeValue
      }

      const propertyValue = Reflect.get(value, property, value)
      if (typeof propertyValue !== 'function') {
        return wrapRuntimeValue(propertyValue, property === 'query')
      }

      if (property === 'transaction') {
        return (...args: unknown[]) => {
          const callback = args[0]
          const wrappedCallback = typeof callback === 'function'
            ? (transaction: object) => unwrapRuntimeValue(callback(wrapRuntimeValue(transaction)))
            : callback
          const result = Reflect.apply(propertyValue, value, [
            wrappedCallback,
            ...args.slice(1).map(unwrapRuntimeValue)
          ])
          return wrapRuntimeValue(result)
        }
      }

      return (...args: unknown[]) => {
        const result = Reflect.apply(propertyValue, value, args.map(unwrapRuntimeValue))
        return wrapRuntimeValue(result)
      }
    },
    has: (_target, property) => {
      if (hiddenRuntimeCapabilities.has(property)
        || (property === 'batch' && !isDatabaseTarget(value))) {
        return false
      }

      return property in value
    },
    ownKeys: () => [],
    getOwnPropertyDescriptor: (_target, property) => {
      const runtimeMethodOverride = runtimeMethodOverrides.get(property)
      if (!runtimeMethodOverride) {
        return undefined
      }

      return {
        configurable: true,
        enumerable: false,
        value: runtimeMethodOverride,
        writable: true
      }
    },
    getPrototypeOf: () => Object.getPrototypeOf(shell),
    set: () => false,
    defineProperty: (_target, property, descriptor) => {
      if (hiddenRuntimeCapabilities.has(property)
        || !hasFunction(value, property)
        || typeof descriptor.value !== 'function'
        || descriptor.configurable === false) {
        return false
      }

      runtimeMethodOverrides.set(property, descriptor.value as (...args: unknown[]) => unknown)
      return true
    },
    deleteProperty: () => false,
    setPrototypeOf: () => false,
    preventExtensions: () => false
  })

  facadeByTarget.set(value, facade)
  targetByFacade.set(facade, value)
  return facade as T
}

function createForwardedMethod<T extends (...args: never[]) => unknown>(target: object, method: T): T {
  return ((...args: Parameters<T>) => {
    const result = Reflect.apply(method, target, args.map(unwrapRuntimeValue))
    return wrapRuntimeValue(result)
  }) as T
}

function createForwardedTransactionMethod<T extends (...args: never[]) => unknown>(target: object, method: T): T {
  return ((...args: Parameters<T>) => {
    const callback = args[0]
    const wrappedCallback = typeof callback === 'function'
      ? (transaction: object) => unwrapRuntimeValue((callback as (transaction: object) => unknown)(wrapRuntimeValue(transaction)))
      : callback
    const result = Reflect.apply(method, target, [
      wrappedCallback,
      ...args.slice(1).map(unwrapRuntimeValue)
    ])
    return wrapRuntimeValue(result)
  }) as T
}

function createApplicationDatabase(database: DrizzleDatabase): AppDatabase {
  const facade: AppDatabase = {
    get query() {
      return wrapRuntimeValue(database.query, true)
    },
    $with: createForwardedMethod(database, database.$with),
    $count: createForwardedMethod(database, database.$count),
    with: createForwardedMethod(database, database.with),
    select: createForwardedMethod(database, database.select),
    selectDistinct: createForwardedMethod(database, database.selectDistinct),
    update: createForwardedMethod(database, database.update),
    insert: createForwardedMethod(database, database.insert),
    delete: createForwardedMethod(database, database.delete),
    run: createForwardedMethod(database, database.run),
    all: createForwardedMethod(database, database.all),
    get: createForwardedMethod(database, database.get),
    values: createForwardedMethod(database, database.values),
    transaction: createForwardedTransactionMethod(database, database.transaction),
    batch: createForwardedMethod(database, database.batch)
  }

  return Object.freeze(facade)
}

function createD1DatabaseClientBinding(
  binding: D1DatabaseBinding | D1DatabaseClientBinding
): D1DatabaseClientBinding {
  return {
    prepare: (query: string) => binding.prepare(query),
    batch: <T>(statements: Parameters<D1DatabaseBinding['batch']>[0]) => binding.batch<T>(statements)
  }
}

function createDrizzleDatabase(binding: D1DatabaseBinding) {
  return drizzle<typeof schema, D1DatabaseBinding>(binding, { schema })
}

export function createNonHttpDatabase(binding: D1DatabaseBinding | D1DatabaseClientBinding): AppDatabase {
  const client = createD1DatabaseClientBinding(binding)
  const database = createDrizzleDatabase(client as D1DatabaseBinding)

  return createApplicationDatabase(database)
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
