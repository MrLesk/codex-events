import { createNonHttpDatabase, resolveNonHttpD1Binding } from '#server/database/non-http'
import {
  defaultApplicationLumaSyncQueueName,
  defaultApplicationLumaSyncRetryDelaySeconds,
  processApplicationLumaSyncQueueBatch,
  recoverStaleApplicationLumaSyncMessages
} from '#server/domains/applications/luma-sync-queue'
import { defaultApplicationReviewEmailQueueName } from '#server/domains/applications/review-email-queue'
import { defaultEventOutcomeEmailQueueName } from '#server/domains/outcomes/email-queue'
import { defaultTalkProposalDecisionEmailQueueName } from '#server/domains/talk-proposals/email-queue'
import { defaultManagedMediaCleanupQueueName } from '#server/domains/media/cleanup-queue'
import { classifyCloudflareQueueBatch, retryCloudflareQueueBatch } from '#server/utils/cloudflare-queue-routing'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('cloudflare:scheduled', async ({ env }) => {
    const runtimeConfig = useRuntimeConfig()
    const cloudflareEnv = env as Record<string, unknown> | undefined
    const database = createNonHttpDatabase(resolveNonHttpD1Binding(runtimeConfig.database?.binding ?? 'DB', cloudflareEnv))
    await recoverStaleApplicationLumaSyncMessages({
      database,
      runtimeConfig,
      cloudflareEnv
    })
  })

  nitroApp.hooks.hook('cloudflare:queue', async ({ batch, env }) => {
    const runtimeConfig = useRuntimeConfig()
    const expectedQueueName = runtimeConfig.luma?.queueName?.trim() || defaultApplicationLumaSyncQueueName
    const reviewEmailQueueName = runtimeConfig.applicationReviewEmails?.queueName?.trim() || defaultApplicationReviewEmailQueueName
    const outcomeQueueName = runtimeConfig.eventOutcomeEmails?.queueName?.trim() || defaultEventOutcomeEmailQueueName
    const talkProposalQueueName = runtimeConfig.talkProposalDecisionEmails?.queueName?.trim() || defaultTalkProposalDecisionEmailQueueName
    const mediaCleanupQueueName = runtimeConfig.mediaCleanup?.queueName?.trim() || defaultManagedMediaCleanupQueueName
    const batchRoute = classifyCloudflareQueueBatch(batch.queue, expectedQueueName, [reviewEmailQueueName, outcomeQueueName, talkProposalQueueName, mediaCleanupQueueName])

    if (batchRoute === 'ignore') {
      return
    }

    if (batchRoute === 'retry') {
      console.error('Unexpected Cloudflare queue batch reached the Luma sync consumer.', {
        batchQueue: batch.queue,
        expectedQueue: expectedQueueName,
        ignoredQueues: [reviewEmailQueueName, outcomeQueueName, talkProposalQueueName, mediaCleanupQueueName]
      })
      retryCloudflareQueueBatch(batch, {
        delaySeconds: runtimeConfig.luma?.retryDelaySeconds ?? defaultApplicationLumaSyncRetryDelaySeconds
      })
      return
    }

    const cloudflareEnv = env as Record<string, unknown> | undefined
    const database = createNonHttpDatabase(resolveNonHttpD1Binding(runtimeConfig.database?.binding ?? 'DB', cloudflareEnv))
    await processApplicationLumaSyncQueueBatch(batch, {
      database,
      runtimeConfig,
      cloudflareEnv
    })
  })
})
