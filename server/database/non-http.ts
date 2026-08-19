import type { H3Event } from 'h3'

import { drizzle, type DrizzleD1Database } from 'drizzle-orm/d1'

import * as schema from './schema'
import { ApiError } from '#server/http/api-error'

export type D1DatabaseBinding = Parameters<typeof drizzle>[0]

export type D1DatabaseClientBinding = Pick<D1DatabaseBinding, 'prepare' | 'batch'>

type DrizzleDatabase = DrizzleD1Database<typeof schema>

type InternalRuntimeKey
  = | '$cache'
    | '$client'
    | '_'
    | '_prepare'
    | 'client'
    | 'constructor'
    | 'dialect'
    | 'getBookmark'
    | 'prepare'
    | 'session'
    | 'stmt'
    | 'withSession'

type BuilderMethodKey
  = | 'all'
    | 'as'
    | 'catch'
    | 'crossJoin'
    | 'delete'
    | 'execute'
    | 'except'
    | 'finally'
    | 'for'
    | 'from'
    | 'fullJoin'
    | 'get'
    | 'getSQL'
    | 'groupBy'
    | 'having'
    | 'innerJoin'
    | 'leftJoin'
    | 'leftJoinLateral'
    | 'limit'
    | 'offset'
    | 'onConflictDoNothing'
    | 'onConflictDoUpdate'
    | 'orderBy'
    | 'returning'
    | 'rightJoin'
    | 'rightJoinLateral'
    | 'run'
    | 'select'
    | 'set'
    | 'then'
    | 'union'
    | 'unionAll'
    | 'values'
    | 'where'

type RelationalBuilderMethodKey = 'findFirst' | 'findMany'

type QueryBuilderMethodKey = 'catch' | 'execute' | 'finally' | 'getSQL' | 'then'

type PublicQueryBuilder<T> = {
  [K in keyof T & QueryBuilderMethodKey]: T[K] extends (...args: infer Arguments) => infer Result
    ? (...args: Arguments) => K extends 'execute' ? Promise<Awaited<Result>> : Result
    : never
}

type PublicBuilderResult<K extends BuilderMethodKey, Result, Allowed extends BuilderMethodKey>
  = K extends 'execute'
    ? Promise<Awaited<Result>>
    : K extends 'all' | 'get' | 'run' | 'then' | 'catch' | 'finally' | 'getSQL'
      ? Result
      : K extends 'as'
        ? PublicSubquery<Result>
        : Result extends object
          ? PublicBuilder<Result, Allowed>
          : Result

type PublicBuilder<T, Allowed extends BuilderMethodKey = BuilderMethodKey> = {
  [K in keyof T & Allowed]: T[K] extends (...args: infer Arguments) => infer Result
    ? (...args: Arguments) => PublicBuilderResult<K, Result, Allowed>
    : never
}

type PublicSubquery<T> = Omit<T, InternalRuntimeKey>

type PublicRelationalBuilder<T> = {
  [K in keyof T & RelationalBuilderMethodKey]: T[K] extends (...args: infer Arguments) => infer Result
    ? (...args: Arguments) => PublicQueryBuilder<Result>
    : never
}

type PublicDatabaseQuery = {
  [K in keyof DrizzleDatabase['query']]: PublicRelationalBuilder<DrizzleDatabase['query'][K]>
}

export type AppDatabaseBatch = ReadonlyArray<unknown>

export type AppDatabase = {
  readonly query: PublicDatabaseQuery
  readonly select: DrizzleDatabase['select']
  readonly get: DrizzleDatabase['get']
  readonly insert: DrizzleDatabase['insert']
  readonly update: DrizzleDatabase['update']
  readonly delete: DrizzleDatabase['delete']
  readonly batch: <TBatch extends AppDatabaseBatch>(batch: TBatch) => Promise<ReadonlyArray<unknown>>
}

type RuntimeBuilderKind = 'mutation' | 'query' | 'relational' | 'select' | 'subquery'
type RuntimeResultKind = RuntimeBuilderKind | 'value'

const facadeByTarget = new WeakMap<object, object>()
const targetByFacade = new WeakMap<object, object>()
const drizzleEntityKind = Symbol.for('drizzle:entityKind')

const selectBuilderMethods: Readonly<Record<string, RuntimeResultKind>> = {
  all: 'value',
  as: 'subquery',
  catch: 'value',
  crossJoin: 'select',
  except: 'select',
  execute: 'value',
  finally: 'value',
  for: 'select',
  from: 'select',
  fullJoin: 'select',
  get: 'value',
  getSQL: 'value',
  groupBy: 'select',
  having: 'select',
  innerJoin: 'select',
  leftJoin: 'select',
  leftJoinLateral: 'select',
  limit: 'select',
  offset: 'select',
  orderBy: 'select',
  rightJoin: 'select',
  rightJoinLateral: 'select',
  run: 'value',
  then: 'value',
  union: 'select',
  unionAll: 'select',
  where: 'select'
}

const mutationBuilderMethods: Readonly<Record<string, RuntimeResultKind>> = {
  all: 'value',
  catch: 'value',
  execute: 'value',
  finally: 'value',
  from: 'mutation',
  fullJoin: 'mutation',
  get: 'value',
  getSQL: 'value',
  innerJoin: 'mutation',
  leftJoin: 'mutation',
  limit: 'mutation',
  onConflictDoNothing: 'mutation',
  onConflictDoUpdate: 'mutation',
  orderBy: 'mutation',
  returning: 'mutation',
  rightJoin: 'mutation',
  run: 'value',
  select: 'mutation',
  set: 'mutation',
  then: 'value',
  values: 'mutation',
  where: 'mutation'
}

const relationalBuilderMethods: Readonly<Record<string, RuntimeResultKind>> = {
  findFirst: 'query',
  findMany: 'query'
}

const queryBuilderMethods: Readonly<Record<string, RuntimeResultKind>> = {
  all: 'value',
  catch: 'value',
  execute: 'value',
  finally: 'value',
  get: 'value',
  getSQL: 'value',
  run: 'value',
  then: 'value'
}

function isObjectLike(value: unknown): value is object {
  return (typeof value === 'object' && value !== null) || typeof value === 'function'
}

function createSafePrototype(target: object) {
  const rawPrototype = Object.getPrototypeOf(target)
  const rawConstructor = rawPrototype ? Reflect.get(rawPrototype, 'constructor') : undefined
  const entityKinds: unknown[] = []
  let currentConstructor = isObjectLike(rawConstructor) ? rawConstructor : undefined
  const visitedConstructors = new Set<object>()

  while (currentConstructor && !visitedConstructors.has(currentConstructor)) {
    visitedConstructors.add(currentConstructor)
    const kind = Reflect.get(currentConstructor, drizzleEntityKind)
    if (kind !== undefined) {
      entityKinds.push(kind)
    }
    const parentConstructor = Object.getPrototypeOf(currentConstructor)
    currentConstructor = parentConstructor && isObjectLike(parentConstructor)
      ? parentConstructor
      : undefined
  }

  let safeConstructor: object | null = null
  for (let index = entityKinds.length - 1; index >= 0; index -= 1) {
    const nextConstructor: object = Object.create(safeConstructor)
    Object.defineProperty(nextConstructor, drizzleEntityKind, {
      configurable: false,
      enumerable: false,
      value: entityKinds[index],
      writable: false
    })
    safeConstructor = Object.freeze(nextConstructor)
  }

  return Object.freeze(Object.create(null, {
    constructor: {
      configurable: false,
      enumerable: false,
      value: safeConstructor,
      writable: false
    }
  }))
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

  if (value && typeof value === 'object' && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)) {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, unwrapRuntimeValue(entry)]))
  }

  return value
}

function wrapRuntimeResult(value: unknown, kind: RuntimeResultKind): unknown {
  if (!isObjectLike(value) || kind === 'value') {
    return value
  }

  const existingFacade = facadeByTarget.get(value)
  if (existingFacade) {
    return existingFacade
  }

  if (kind === 'subquery') {
    return createSubqueryFacade(value)
  }

  const methodMap = kind === 'select'
    ? selectBuilderMethods
    : kind === 'mutation'
      ? mutationBuilderMethods
      : kind === 'relational'
        ? relationalBuilderMethods
        : queryBuilderMethods

  return createBuilderFacade(value, methodMap)
}

function createBuilderFacade<T extends object>(target: T, methodMap: Readonly<Record<string, RuntimeResultKind>>): object {
  const existingFacade = facadeByTarget.get(target)
  if (existingFacade) {
    return existingFacade
  }

  const facade = Object.create(createSafePrototype(target)) as Record<PropertyKey, unknown>

  for (const [property, resultKind] of Object.entries(methodMap)) {
    const method = Reflect.get(target, property, target)
    if (typeof method !== 'function') {
      continue
    }

    Object.defineProperty(facade, property, {
      configurable: true,
      enumerable: false,
      value: (...args: unknown[]) => wrapRuntimeResult(
        Reflect.apply(method, target, args.map(unwrapRuntimeValue)),
        resultKind
      ),
      writable: true
    })
  }

  Object.preventExtensions(facade)
  facadeByTarget.set(target, facade)
  targetByFacade.set(facade, target)
  return facade
}

function createSubqueryFacade(target: object) {
  const facade = Object.create(createSafePrototype(target)) as Record<PropertyKey, unknown>
  const rawInternalState = Reflect.get(target, '_', target) as { selectedFields?: object } | undefined
  const selectedFields = rawInternalState?.selectedFields

  for (const property of selectedFields ? Object.keys(selectedFields) : []) {
    Object.defineProperty(facade, property, {
      configurable: true,
      enumerable: false,
      value: Reflect.get(target, property, target),
      writable: true
    })
  }

  const getSQL = Reflect.get(target, 'getSQL', target)
  if (typeof getSQL === 'function') {
    Object.defineProperty(facade, 'getSQL', {
      configurable: true,
      enumerable: false,
      value: () => Reflect.apply(getSQL, target, []),
      writable: true
    })
  }

  Object.preventExtensions(facade)
  facadeByTarget.set(target, facade)
  targetByFacade.set(facade, target)
  return facade
}

function createRelationalQueryFacade(databaseQuery: object) {
  const facade = Object.create(null) as Record<string, object>

  for (const tableName of Object.keys(databaseQuery)) {
    const relationalBuilder = Reflect.get(databaseQuery, tableName, databaseQuery)
    if (isObjectLike(relationalBuilder)) {
      facade[tableName] = createBuilderFacade(relationalBuilder, relationalBuilderMethods)
    }
  }

  return Object.freeze(facade)
}

function createForwardedDatabaseMethod<T extends (...args: never[]) => unknown>(
  target: object,
  method: T,
  resultKind: RuntimeResultKind
): T {
  return ((...args: Parameters<T>) => wrapRuntimeResult(
    Reflect.apply(method, target, args.map(unwrapRuntimeValue)),
    resultKind
  )) as T
}

function createApplicationDatabase(database: DrizzleDatabase): AppDatabase {
  const facade: AppDatabase = {
    query: createRelationalQueryFacade(database.query) as PublicDatabaseQuery,
    select: createForwardedDatabaseMethod(database, database.select, 'select') as DrizzleDatabase['select'],
    get: createForwardedDatabaseMethod(database, database.get, 'value') as DrizzleDatabase['get'],
    insert: createForwardedDatabaseMethod(database, database.insert, 'mutation') as DrizzleDatabase['insert'],
    update: createForwardedDatabaseMethod(database, database.update, 'mutation') as DrizzleDatabase['update'],
    delete: createForwardedDatabaseMethod(database, database.delete, 'mutation') as DrizzleDatabase['delete'],
    batch: async batch => await database.batch(unwrapRuntimeValue(batch) as never)
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

export function createRequestDatabase(binding: D1DatabaseClientBinding): AppDatabase {
  return createApplicationDatabase(createDrizzleDatabase(binding as D1DatabaseBinding))
}

export function createNonHttpDatabase(binding: D1DatabaseBinding | D1DatabaseClientBinding): AppDatabase {
  const client = createD1DatabaseClientBinding(binding)
  return createRequestDatabase(client)
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
