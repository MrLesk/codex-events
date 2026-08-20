import {
  defaultManagedMediaCleanupRetryDelaySeconds,
  getManagedMediaCleanupQueueName,
  processManagedMediaCleanupQueueBatch
} from '#server/domains/media/cleanup-queue'
import { defaultApplicationLumaSyncQueueName } from '#server/domains/applications/luma-sync-queue'
import { defaultApplicationReviewEmailQueueName } from '#server/domains/applications/review-email-queue'
import { defaultEventOutcomeEmailQueueName } from '#server/domains/outcomes/email-queue'
import { defaultTalkProposalDecisionEmailQueueName } from '#server/domains/talk-proposals/email-queue'
import { classifyCloudflareQueueBatch, retryCloudflareQueueBatch } from '#server/utils/cloudflare-queue-routing'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('cloudflare:queue', async ({ batch, env }) => {
    const runtimeConfig = useRuntimeConfig()
    const expectedQueueName = getManagedMediaCleanupQueueName(runtimeConfig)
    const ignoredQueueNames = [
      runtimeConfig.applicationReviewEmails?.queueName?.trim() || defaultApplicationReviewEmailQueueName,
      runtimeConfig.eventOutcomeEmails?.queueName?.trim() || defaultEventOutcomeEmailQueueName,
      runtimeConfig.luma?.queueName?.trim() || defaultApplicationLumaSyncQueueName,
      runtimeConfig.talkProposalDecisionEmails?.queueName?.trim() || defaultTalkProposalDecisionEmailQueueName
    ]
    const batchRoute = classifyCloudflareQueueBatch(batch.queue, expectedQueueName, ignoredQueueNames)

    if (batchRoute === 'ignore') {
      return
    }

    if (batchRoute === 'retry') {
      console.error('Unexpected Cloudflare queue batch reached the managed media cleanup consumer.', {
        batchQueue: batch.queue,
        expectedQueue: expectedQueueName,
        ignoredQueues: ignoredQueueNames
      })
      retryCloudflareQueueBatch(batch, {
        delaySeconds: runtimeConfig.mediaCleanup?.retryDelaySeconds ?? defaultManagedMediaCleanupRetryDelaySeconds
      })
      return
    }

    await processManagedMediaCleanupQueueBatch(batch, {
      runtimeConfig,
      cloudflareEnv: env as Record<string, unknown> | undefined
    })
  })
})
