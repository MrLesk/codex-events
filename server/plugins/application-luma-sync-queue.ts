import { processApplicationLumaSyncQueueBatch } from '../utils/application-luma-sync-queue'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('cloudflare:queue', async ({ batch, env }) => {
    await processApplicationLumaSyncQueueBatch(batch, {
      runtimeConfig: useRuntimeConfig(),
      cloudflareEnv: env as Record<string, unknown> | undefined
    })
  })
})
