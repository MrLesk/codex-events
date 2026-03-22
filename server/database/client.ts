import type { H3Event } from 'h3'

import { drizzle } from 'drizzle-orm/d1'

import * as schema from './schema'
import { ApiError } from '../utils/api-error'

export type D1DatabaseBinding = Parameters<typeof drizzle>[0]
export type AppDatabase = ReturnType<typeof createDatabase>
export type AppDatabaseTransaction = Parameters<Parameters<AppDatabase['transaction']>[0]>[0]

type CloudflareEnv = Record<string, unknown> | undefined
type RuntimeConfigShape = {
  database?: {
    binding?: string
  }
}

export function createDatabase(binding: D1DatabaseBinding) {
  return drizzle(binding, { schema })
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
  return resolveD1Binding(getConfiguredBindingName(event), cloudflareEnv, event.context.d1Database)
}

export function getDatabase(event: H3Event) {
  event.context.appDb ??= createDatabase(getD1Binding(event))
  return event.context.appDb
}

export function setDatabase(event: H3Event, database: AppDatabase) {
  event.context.appDb = database
}

export async function withDatabaseTransaction<T>(
  database: AppDatabase,
  callback: (transaction: AppDatabaseTransaction) => Promise<T>
) {
  return database.transaction(callback)
}
