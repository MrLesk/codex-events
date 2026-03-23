import type { D1DatabaseBinding } from '../database/client'

import { ApiError } from '../utils/api-error'
import { createLocalPlatformProxy } from '../database/local-platform-proxy'

const localPlatformProxyCache = new Map<string, Promise<Awaited<ReturnType<typeof createLocalPlatformProxy>>>>()

export default defineEventHandler(async (event) => {
  if (event.context.d1Database) {
    return
  }

  const runtimeConfig = useRuntimeConfig(event)
  const bindingName = runtimeConfig.database?.binding ?? 'DB'
  const cloudflareBinding = event.context.cloudflare?.env?.[bindingName]

  if (cloudflareBinding) {
    return
  }

  let proxyPromise = localPlatformProxyCache.get(bindingName)

  if (!proxyPromise) {
    proxyPromise = createLocalPlatformProxy()
    localPlatformProxyCache.set(bindingName, proxyPromise)
    proxyPromise.catch(() => localPlatformProxyCache.delete(bindingName))
  }

  const proxy = await proxyPromise
  const d1Database = proxy.env[bindingName]

  if (!d1Database) {
    throw new ApiError({
      statusCode: 500,
      code: 'database_binding_missing',
      message: `The local Cloudflare D1 binding "${bindingName}" could not be resolved from wrangler.jsonc.`,
      details: { binding: bindingName }
    })
  }

  event.context.d1Database = d1Database as D1DatabaseBinding as never
})
