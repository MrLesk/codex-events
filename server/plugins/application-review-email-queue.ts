import {
  defaultApplicationReviewEmailQueueName,
  defaultApplicationReviewEmailRetryDelaySeconds,
  processApplicationReviewEmailQueueBatch
} from '../utils/application-review-email-queue'
import { defaultApplicationLumaSyncQueueName } from '../utils/application-luma-sync-queue'
import { classifyCloudflareQueueBatch, retryCloudflareQueueBatch } from '../utils/cloudflare-queue-routing'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('cloudflare:queue', async ({ batch }) => {
    const runtimeConfig = useRuntimeConfig()
    const expectedQueueName = runtimeConfig.applicationReviewEmails?.queueName?.trim() || defaultApplicationReviewEmailQueueName
    const lumaQueueName = runtimeConfig.luma?.queueName?.trim() || defaultApplicationLumaSyncQueueName
    const batchRoute = classifyCloudflareQueueBatch(batch.queue, expectedQueueName, [lumaQueueName])

    if (batchRoute === 'ignore') {
      return
    }

    if (batchRoute === 'retry') {
      console.error('Unexpected Cloudflare queue batch reached the review email consumer.', {
        batchQueue: batch.queue,
        expectedQueue: expectedQueueName,
        ignoredQueues: [lumaQueueName]
      })
      retryCloudflareQueueBatch(batch, {
        delaySeconds: runtimeConfig.applicationReviewEmails?.retryDelaySeconds ?? defaultApplicationReviewEmailRetryDelaySeconds
      })
      return
    }

    await processApplicationReviewEmailQueueBatch(batch, {
      runtimeConfig
    })
  })
})
