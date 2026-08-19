import type { H3Event } from 'h3'

import { drizzle } from 'drizzle-orm/d1'

import * as schema from './schema'
import { ApiError } from '#server/http/api-error'

export type D1DatabaseBinding = Parameters<typeof drizzle>[0]

export type D1DatabaseClientBinding = Pick<D1DatabaseBinding, 'prepare' | 'batch'>

function createD1DatabaseClientBinding(
  binding: D1DatabaseBinding | D1DatabaseClientBinding
): D1DatabaseClientBinding {
  return {
    prepare: (query: string) => binding.prepare(query),
    batch: <T>(statements: Parameters<D1DatabaseBinding['batch']>[0]) => binding.batch<T>(statements)
  }
}

function createDrizzleDatabase(binding: D1DatabaseBinding) {
  return drizzle(binding, { schema })
}

type DrizzleAppDatabase = ReturnType<typeof createDrizzleDatabase>

export type AppDatabase = Omit<DrizzleAppDatabase, '$client'>

export function createNonHttpDatabase(binding: D1DatabaseBinding | D1DatabaseClientBinding): AppDatabase {
  const client = createD1DatabaseClientBinding(binding)
  const database = createDrizzleDatabase(client as D1DatabaseBinding)

  Reflect.deleteProperty(database, '$client')

  return database as AppDatabase
}

export type AppDatabaseBatch = Parameters<AppDatabase['batch']>[0]

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
