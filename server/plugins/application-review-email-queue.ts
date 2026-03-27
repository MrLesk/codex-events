import { processApplicationReviewEmailQueueBatch } from '../utils/application-review-email-queue'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('cloudflare:queue', async ({ batch }) => {
    await processApplicationReviewEmailQueueBatch(batch, {
      runtimeConfig: useRuntimeConfig()
    })
  })
})
