import type { D1DatabaseBinding } from '../database/client'

import { ApiError } from '../utils/api-error'
import { createLocalPlatformProxy } from '../database/local-platform-proxy'

const localPlatformProxyCache = new Map<'local', Promise<Awaited<ReturnType<typeof createLocalPlatformProxy>>>>()

interface R2BucketLike {
  get: (key: string) => Promise<unknown>
  put: (key: string, value: ArrayBuffer | ArrayBufferView, options?: unknown) => Promise<unknown>
  delete: (key: string) => Promise<void>
}

function isR2BucketLike(value: unknown): value is R2BucketLike {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<R2BucketLike>
  return typeof candidate.get === 'function'
    && typeof candidate.put === 'function'
    && typeof candidate.delete === 'function'
}

export default defineEventHandler(async (event) => {
  const runtimeConfig = useRuntimeConfig(event)
  const databaseBindingName = runtimeConfig.database?.binding ?? 'DB'
  const profileIconsBindingName = runtimeConfig.profileIcons?.binding ?? 'PROFILE_ICONS'
  const cloudflareEnv = event.context.cloudflare?.env as Record<string, unknown> | undefined

  const hasDatabaseBinding = Boolean(event.context.d1Database || cloudflareEnv?.[databaseBindingName])
  const hasProfileIconsBinding = Boolean(cloudflareEnv?.[profileIconsBindingName])

  if (hasDatabaseBinding && hasProfileIconsBinding) {
    return
  }

  let proxyPromise = localPlatformProxyCache.get('local')

  if (!proxyPromise) {
    proxyPromise = createLocalPlatformProxy()
    localPlatformProxyCache.set('local', proxyPromise)
    proxyPromise.catch(() => localPlatformProxyCache.delete('local'))
  }

  const proxy = await proxyPromise
  const proxyEnv = proxy.env as Record<string, unknown>
  const d1Database = (cloudflareEnv?.[databaseBindingName] ?? proxyEnv[databaseBindingName]) as D1DatabaseBinding | undefined
  const existingProfileIconsBucket = cloudflareEnv?.[profileIconsBindingName]
  const proxyProfileIconsBucket = proxyEnv[profileIconsBindingName]
    ?? (profileIconsBindingName === 'PROFILE_ICONS' ? undefined : proxyEnv.PROFILE_ICONS)
  const profileIconsBucket = existingProfileIconsBucket ?? proxyProfileIconsBucket

  if (!d1Database) {
    throw new ApiError({
      statusCode: 500,
      code: 'database_binding_missing',
      message: `The local Cloudflare D1 binding "${databaseBindingName}" could not be resolved from wrangler.jsonc.`,
      details: { binding: databaseBindingName }
    })
  }

  event.context.cloudflare ??= {} as never
  event.context.cloudflare.env ??= {} as never

  if (!event.context.cloudflare.env[databaseBindingName]) {
    event.context.cloudflare.env[databaseBindingName] = d1Database as never
  }

  if (!event.context.cloudflare.env[profileIconsBindingName] && isR2BucketLike(profileIconsBucket)) {
    event.context.cloudflare.env[profileIconsBindingName] = profileIconsBucket as never
  }

  const profileIconContext = event.context as typeof event.context & { profileIconsBucket?: R2BucketLike }
  profileIconContext.profileIconsBucket = isR2BucketLike(profileIconsBucket)
    ? profileIconsBucket
    : undefined
  event.context.d1Database = d1Database as D1DatabaseBinding as never
})
