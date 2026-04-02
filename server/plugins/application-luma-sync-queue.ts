import {
  defaultApplicationLumaSyncQueueName,
  defaultApplicationLumaSyncRetryDelaySeconds,
  processApplicationLumaSyncQueueBatch
} from '../utils/application-luma-sync-queue'
import { defaultApplicationReviewEmailQueueName } from '../utils/application-review-email-queue'
import { classifyCloudflareQueueBatch, retryCloudflareQueueBatch } from '../utils/cloudflare-queue-routing'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('cloudflare:queue', async ({ batch, env }) => {
    const runtimeConfig = useRuntimeConfig()
    const expectedQueueName = runtimeConfig.luma?.queueName?.trim() || defaultApplicationLumaSyncQueueName
    const reviewEmailQueueName = runtimeConfig.applicationReviewEmails?.queueName?.trim() || defaultApplicationReviewEmailQueueName
    const batchRoute = classifyCloudflareQueueBatch(batch.queue, expectedQueueName, [reviewEmailQueueName])

    if (batchRoute === 'ignore') {
      return
    }

    if (batchRoute === 'retry') {
      console.error('Unexpected Cloudflare queue batch reached the Luma sync consumer.', {
        batchQueue: batch.queue,
        expectedQueue: expectedQueueName,
        ignoredQueues: [reviewEmailQueueName]
      })
      retryCloudflareQueueBatch(batch, {
        delaySeconds: runtimeConfig.luma?.retryDelaySeconds ?? defaultApplicationLumaSyncRetryDelaySeconds
      })
      return
    }

    await processApplicationLumaSyncQueueBatch(batch, {
      runtimeConfig: useRuntimeConfig(),
      cloudflareEnv: env as Record<string, unknown> | undefined
    })
  })
})
