import {
  scheduleApplicationLumaSyncStartupRecovery
} from '#server/utils/application-luma-sync-queue'

type CloudflareContextWithWaitUntil = {
  waitUntil?: (promise: Promise<unknown>) => void
}

export default defineEventHandler((event) => {
  const recoveryPromise = scheduleApplicationLumaSyncStartupRecovery({
    runtimeConfig: useRuntimeConfig(event),
    cloudflareEnv: event.context.cloudflare?.env as Record<string, unknown> | undefined,
    d1Database: event.context.d1Database
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
