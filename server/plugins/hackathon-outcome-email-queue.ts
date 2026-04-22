import {
  defaultHackathonOutcomeEmailQueueName,
  defaultHackathonOutcomeEmailRetryDelaySeconds,
  processHackathonOutcomeEmailQueueBatch
} from '../utils/hackathon-outcome-email-queue'
import { defaultApplicationLumaSyncQueueName } from '../utils/application-luma-sync-queue'
import { defaultApplicationReviewEmailQueueName } from '../utils/application-review-email-queue'
import { classifyCloudflareQueueBatch, retryCloudflareQueueBatch } from '../utils/cloudflare-queue-routing'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('cloudflare:queue', async ({ batch, env }) => {
    const runtimeConfig = useRuntimeConfig()
    const expectedQueueName = runtimeConfig.hackathonOutcomeEmails?.queueName?.trim() || defaultHackathonOutcomeEmailQueueName
    const reviewEmailQueueName = runtimeConfig.applicationReviewEmails?.queueName?.trim() || defaultApplicationReviewEmailQueueName
    const lumaQueueName = runtimeConfig.luma?.queueName?.trim() || defaultApplicationLumaSyncQueueName
    const batchRoute = classifyCloudflareQueueBatch(batch.queue, expectedQueueName, [reviewEmailQueueName, lumaQueueName])

    if (batchRoute === 'ignore') {
      return
    }

    if (batchRoute === 'retry') {
      console.error('Unexpected Cloudflare queue batch reached the hackathon outcome email consumer.', {
        batchQueue: batch.queue,
        expectedQueue: expectedQueueName,
        ignoredQueues: [reviewEmailQueueName, lumaQueueName]
      })
      retryCloudflareQueueBatch(batch, {
        delaySeconds: runtimeConfig.hackathonOutcomeEmails?.retryDelaySeconds ?? defaultHackathonOutcomeEmailRetryDelaySeconds
      })
      return
    }

    await processHackathonOutcomeEmailQueueBatch(batch, {
      runtimeConfig,
      cloudflareEnv: env as Record<string, unknown> | undefined
    })
  })
})
