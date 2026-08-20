import { createNonHttpDatabase, resolveNonHttpD1Binding } from '#server/database/non-http'
import { defaultApplicationLumaSyncQueueName } from '#server/domains/applications/luma-sync-queue'
import { defaultApplicationReviewEmailQueueName } from '#server/domains/applications/review-email-queue'
import { defaultEventOutcomeEmailQueueName } from '#server/domains/outcomes/email-queue'
import { defaultManagedMediaCleanupQueueName } from '#server/domains/media/cleanup-queue'
import {
  defaultTalkProposalDecisionEmailQueueName,
  defaultTalkProposalDecisionEmailRetryDelaySeconds,
  processTalkProposalDecisionEmailQueueBatch,
  reconcilePendingTalkProposalDecisionEmails
} from '#server/domains/talk-proposals/email-queue'
import { classifyCloudflareQueueBatch, retryCloudflareQueueBatch } from '#server/utils/cloudflare-queue-routing'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('cloudflare:scheduled', async ({ env }) => {
    const runtimeConfig = useRuntimeConfig()
    const cloudflareEnv = env as Record<string, unknown> | undefined
    const database = createNonHttpDatabase(resolveNonHttpD1Binding(runtimeConfig.database?.binding ?? 'DB', cloudflareEnv))
    await reconcilePendingTalkProposalDecisionEmails({
      database,
      runtimeConfig,
      cloudflareEnv,
      trigger: 'scheduled'
    })
  })

  nitroApp.hooks.hook('cloudflare:queue', async ({ batch, env }) => {
    const runtimeConfig = useRuntimeConfig()
    const expectedQueueName = runtimeConfig.talkProposalDecisionEmails?.queueName?.trim() || defaultTalkProposalDecisionEmailQueueName
    const ignoredQueues = [
      runtimeConfig.applicationReviewEmails?.queueName?.trim() || defaultApplicationReviewEmailQueueName,
      runtimeConfig.eventOutcomeEmails?.queueName?.trim() || defaultEventOutcomeEmailQueueName,
      runtimeConfig.luma?.queueName?.trim() || defaultApplicationLumaSyncQueueName,
      runtimeConfig.mediaCleanup?.queueName?.trim() || defaultManagedMediaCleanupQueueName
    ]
    const route = classifyCloudflareQueueBatch(batch.queue, expectedQueueName, ignoredQueues)
    if (route === 'ignore') return
    if (route === 'retry') {
      console.error('Unexpected Cloudflare queue batch reached the Talk proposal decision email consumer.', {
        batchQueue: batch.queue,
        expectedQueue: expectedQueueName,
        ignoredQueues
      })
      retryCloudflareQueueBatch(batch, {
        delaySeconds: runtimeConfig.talkProposalDecisionEmails?.retryDelaySeconds ?? defaultTalkProposalDecisionEmailRetryDelaySeconds
      })
      return
    }
    const cloudflareEnv = env as Record<string, unknown> | undefined
    const database = createNonHttpDatabase(resolveNonHttpD1Binding(runtimeConfig.database?.binding ?? 'DB', cloudflareEnv))
    await processTalkProposalDecisionEmailQueueBatch(batch, { database, runtimeConfig, cloudflareEnv })
  })
})
