import { createNonHttpDatabase, resolveNonHttpD1Binding } from '#server/database/non-http'
import {
  defaultEventOutcomeEmailQueueName,
  defaultEventOutcomeEmailRetryDelaySeconds,
  processEventOutcomeEmailQueueBatch
} from '#server/domains/outcomes/email-queue'
import { defaultApplicationLumaSyncQueueName } from '#server/domains/applications/luma-sync-queue'
import { defaultApplicationReviewEmailQueueName } from '#server/domains/applications/review-email-queue'
import { defaultTalkProposalDecisionEmailQueueName } from '#server/domains/talk-proposals/email-queue'
import { classifyCloudflareQueueBatch, retryCloudflareQueueBatch } from '#server/utils/cloudflare-queue-routing'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('cloudflare:queue', async ({ batch, env }) => {
    const runtimeConfig = useRuntimeConfig()
    const expectedQueueName = runtimeConfig.eventOutcomeEmails?.queueName?.trim() || defaultEventOutcomeEmailQueueName
    const reviewEmailQueueName = runtimeConfig.applicationReviewEmails?.queueName?.trim() || defaultApplicationReviewEmailQueueName
    const lumaQueueName = runtimeConfig.luma?.queueName?.trim() || defaultApplicationLumaSyncQueueName
    const talkProposalQueueName = runtimeConfig.talkProposalDecisionEmails?.queueName?.trim() || defaultTalkProposalDecisionEmailQueueName
    const batchRoute = classifyCloudflareQueueBatch(batch.queue, expectedQueueName, [reviewEmailQueueName, lumaQueueName, talkProposalQueueName])

    if (batchRoute === 'ignore') {
      return
    }

    if (batchRoute === 'retry') {
      console.error('Unexpected Cloudflare queue batch reached the event outcome email consumer.', {
        batchQueue: batch.queue,
        expectedQueue: expectedQueueName,
        ignoredQueues: [reviewEmailQueueName, lumaQueueName, talkProposalQueueName]
      })
      retryCloudflareQueueBatch(batch, {
        delaySeconds: runtimeConfig.eventOutcomeEmails?.retryDelaySeconds ?? defaultEventOutcomeEmailRetryDelaySeconds
      })
      return
    }

    const cloudflareEnv = env as Record<string, unknown> | undefined
    const database = createNonHttpDatabase(resolveNonHttpD1Binding(runtimeConfig.database?.binding ?? 'DB', cloudflareEnv))
    await processEventOutcomeEmailQueueBatch(batch, {
      database,
      runtimeConfig,
      cloudflareEnv
    })
  })
})
