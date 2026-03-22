import { createRequire } from 'node:module'

import { createLocalD1Binding } from '../database/local-d1'

const require = createRequire(import.meta.url)
const { DatabaseSync } = require('node:sqlite') as typeof import('node:sqlite')

const localBindingCache = new Map<string, ReturnType<typeof createLocalD1Binding>>()

export default defineEventHandler((event) => {
  if (event.context.d1Database) {
    return
  }

  const runtimeConfig = useRuntimeConfig(event)
  const bindingName = runtimeConfig.database?.binding ?? 'DB'
  const cloudflareBinding = event.context.cloudflare?.env?.[bindingName]

  if (cloudflareBinding) {
    return
  }

  const sqlitePath = runtimeConfig.database?.localSqlitePath

  if (!sqlitePath) {
    return
  }

  const cachedBinding = localBindingCache.get(sqlitePath)

  if (cachedBinding) {
    event.context.d1Database = cachedBinding as never
    return
  }

  const sqlite = new DatabaseSync(sqlitePath)
  const d1Database = createLocalD1Binding(sqlite)
  localBindingCache.set(sqlitePath, d1Database)
  event.context.d1Database = d1Database as never
})
