import {
  scheduleApplicationLumaSyncStartupRecovery
} from '#server/domains/applications/luma-sync-queue'
import { getDatabase } from '#server/database/client'

type CloudflareContextWithWaitUntil = {
  waitUntil?: (promise: Promise<unknown>) => void
}

export default defineEventHandler((event) => {
  const runtimeConfig = useRuntimeConfig(event)
  const cloudflareEnv = event.context.cloudflare?.env as Record<string, unknown> | undefined
  const bindingName = (runtimeConfig as { database?: { binding?: string } }).database?.binding ?? 'DB'

  // Local-dev asset and tooling requests carry no D1 binding; skip and let the
  // first request that has one run the recovery instead of logging an error.
  if (!cloudflareEnv?.[bindingName]) {
    return
  }

  const recoveryPromise = scheduleApplicationLumaSyncStartupRecovery({
    database: getDatabase(event),
    runtimeConfig,
    cloudflareEnv
  }).catch((error) => {
    console.error('Application Luma sync startup recovery failed.', {
      message: error instanceof Error ? error.message : 'Unexpected startup recovery error'
    })
  })
  const cloudflareContext = (event.context.cloudflare as {
    context?: CloudflareContextWithWaitUntil
  } | undefined)?.context

  if (typeof cloudflareContext?.waitUntil === 'function') {
    cloudflareContext.waitUntil(recoveryPromise)
    return
  }

  void recoveryPromise
})
