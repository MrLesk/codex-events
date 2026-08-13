import { afterEach, describe, expect, test, vi } from 'vitest'
import { eq } from 'drizzle-orm'

import { auditLogs, events, talkProposals, users } from '../../../../../server/database/schema'
import {
  buildTalkProposalDecisionEmailQueueMessage,
  enqueuePendingTalkProposalDecisionEmail,
  reconcilePendingTalkProposalDecisionEmails,
  processTalkProposalDecisionEmailQueueMessage
} from '../../../../../server/domains/talk-proposals/email-queue'
import {
  buildTalkProposalDecisionEmailContent,
  sendTalkProposalDecisionEmail
} from '../../../../../server/domains/talk-proposals/emails'
import { createApiRouteTestHarness } from '../../../../support/backend/api-route'

async function seed(harness: ReturnType<typeof createApiRouteTestHarness>) {
  await harness.database.insert(users).values([
    { id: 'owner', auth0Subject: 'auth0|owner', email: 'owner@example.com', displayName: 'Owner Person' },
    { id: 'admin', auth0Subject: 'auth0|admin', email: 'admin@example.com', displayName: 'Admin Person' }
  ])
  await harness.database.insert(events).values({
    id: 'meetup', eventType: 'meetup', name: 'Meetup', slug: 'meetup', description: 'Meetup', city: 'Vienna', country: 'Austria', address: 'Address',
    registrationOpensAt: '2020-01-01T00:00:00.000Z', registrationClosesAt: '2099-01-01T00:00:00.000Z', state: 'registration_open', maxTeamMembers: 1,
    talkProposalsEnabled: true, talkProposalOpensAt: '2020-01-01T00:00:00.000Z', talkProposalClosesAt: '2099-01-01T00:00:00.000Z', createdByUserId: 'admin'
  })
  await harness.database.insert(talkProposals).values({
    id: 'proposal', eventId: 'meetup', userId: 'owner', status: 'accepted', title: 'Private title', abstract: 'Private abstract',
    reviewedByUserId: 'admin', decidedAt: '2026-08-13T12:00:00.000Z',
    decisionEmailDeliveryId: 'talk-proposal-decision:proposal', decisionEmailState: 'enqueued'
  })
}

function queueMessage(body: unknown) {
  return { id: 'message', body, attempts: 1, ack: vi.fn(), retry: vi.fn() }
}

describe('Talk proposal decision email queue', () => {
  const harnesses: Array<ReturnType<typeof createApiRouteTestHarness>> = []
  afterEach(async () => {
    while (harnesses.length > 0) await harnesses.pop()?.d1Database.close()
  })

  test('email content includes the decision, optional message, and workspace link', () => {
    const content = buildTalkProposalDecisionEmailContent({
      proposalId: 'proposal', decision: 'accepted', decidedAt: '2026-08-13T12:00:00.000Z', recipientEmail: 'owner@example.com',
      recipientDisplayName: 'Owner Person', eventName: 'Vienna Meetup', eventSlug: 'vienna-meetup', decisionMessage: 'Please confirm your availability.'
    }, 'https://events.example.com')
    expect(content.text).toContain('was accepted')
    expect(content.text).toContain('Please confirm your availability.')
    expect(content.workspaceUrl).toBe('https://events.example.com/account/events/vienna-meetup')
  })

  test('email delivery supplies a deterministic provider key', async () => {
    const send = vi.fn().mockResolvedValue({ messageId: 'email_1' })
    const result = await sendTalkProposalDecisionEmail({ context: {} } as Parameters<typeof sendTalkProposalDecisionEmail>[0], {
      proposalId: 'proposal', decision: 'rejected', decidedAt: '2026-08-13T12:00:00.000Z',
      recipientEmail: 'owner@example.com', recipientDisplayName: 'Owner Person', eventName: 'Meetup', eventSlug: 'meetup'
    }, {
      runtimeConfig: { outboundEmail: { fromEmail: 'notifications@example.com' } },
      emailBinding: { send }
    })
    expect(result).toEqual({ status: 'sent', messageId: 'email_1' })
    expect(send).toHaveBeenCalledWith(expect.objectContaining({
      headers: {
        'X-Codex-Notification-Type': 'talk_proposal_rejected',
        'X-Codex-Email-Key': 'talk-proposal:proposal:rejected:2026-08-13T12:00:00.000Z'
      }
    }))
  })

  test('retryable failure records an attempt without logging proposal content, then sends idempotently', async () => {
    const harness = createApiRouteTestHarness({ routes: [] })
    harnesses.push(harness)
    await seed(harness)
    const body = buildTalkProposalDecisionEmailQueueMessage({
      proposalId: 'proposal'
    })
    expect(body).toEqual({ proposalId: 'proposal', deliveryId: 'talk-proposal-decision:proposal' })
    const failedMessage = queueMessage(body)
    const failed = await processTalkProposalDecisionEmailQueueMessage(failedMessage, {
      database: harness.database,
      sendEmail: vi.fn().mockResolvedValue({ status: 'failed', reason: 'transport_error', providerError: null })
    })
    expect(failed.action).toBe('retry')
    expect(failedMessage.retry).toHaveBeenCalledWith({ delaySeconds: 120 })
    expect((await harness.database.query.talkProposals.findFirst({ where: eq(talkProposals.id, 'proposal') }))?.decisionEmailFailedAt).not.toBeNull()

    const sentMessage = queueMessage(body)
    const sendEmail = vi.fn().mockResolvedValue({ status: 'sent', messageId: 'email_1' })
    const sent = await processTalkProposalDecisionEmailQueueMessage(sentMessage, {
      database: harness.database,
      sendEmail
    })
    expect(sent.action).toBe('ack')
    expect(sendEmail).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      proposalId: 'proposal',
      decision: 'accepted',
      recipientEmail: 'owner@example.com',
      eventName: 'Meetup'
    }), expect.anything())
    const proposal = await harness.database.query.talkProposals.findFirst({ where: eq(talkProposals.id, 'proposal') })
    expect(proposal?.decisionEmailSentAt).not.toBeNull()
    const audit = await harness.database.query.auditLogs.findFirst({ where: eq(auditLogs.entityId, 'proposal') })
    expect(JSON.stringify(audit?.metadata)).not.toContain('Private title')
    expect(JSON.stringify(audit?.metadata)).not.toContain('Private abstract')

    const duplicateMessage = queueMessage(body)
    const duplicate = await processTalkProposalDecisionEmailQueueMessage(duplicateMessage, {
      database: harness.database,
      sendEmail: vi.fn()
    })
    expect(duplicate.reason).toBe('delivery_already_sent')
  })

  test('concurrent and duplicate deliveries contact the provider only once', async () => {
    const harness = createApiRouteTestHarness({ routes: [] })
    harnesses.push(harness)
    await seed(harness)
    const body = buildTalkProposalDecisionEmailQueueMessage({ proposalId: 'proposal' })
    const sendEmail = vi.fn().mockResolvedValue({ status: 'sent', messageId: 'email_1' })
    const [first, second] = await Promise.all([
      processTalkProposalDecisionEmailQueueMessage(queueMessage(body), { database: harness.database, sendEmail }),
      processTalkProposalDecisionEmailQueueMessage(queueMessage(body), { database: harness.database, sendEmail })
    ])

    expect(sendEmail).toHaveBeenCalledTimes(1)
    expect([first.reason, second.reason]).toContain('delivery_sent')
    expect(['delivery_claim_active', 'delivery_already_sent']).toContain(
      [first.reason, second.reason].find(reason => reason !== 'delivery_sent')
    )
  })

  test('an expired delivery lease recovers a worker crash while an active lease defers duplicates', async () => {
    const harness = createApiRouteTestHarness({ routes: [] })
    harnesses.push(harness)
    await seed(harness)
    const body = buildTalkProposalDecisionEmailQueueMessage({ proposalId: 'proposal' })
    await harness.database.update(talkProposals).set({
      decisionEmailState: 'delivering',
      decisionEmailDeliveryLeaseToken: 'crashed-worker',
      decisionEmailDeliveryLeaseExpiresAt: '2026-08-13T11:59:00.000Z'
    }).where(eq(talkProposals.id, 'proposal'))

    const recoveredSend = vi.fn().mockResolvedValue({ status: 'sent', messageId: 'email_recovered' })
    const recovered = await processTalkProposalDecisionEmailQueueMessage(queueMessage(body), {
      database: harness.database,
      sendEmail: recoveredSend,
      now: new Date('2026-08-13T12:00:00.000Z')
    })
    expect(recovered.reason).toBe('delivery_sent')
    expect(recoveredSend).toHaveBeenCalledTimes(1)

    await harness.database.update(talkProposals).set({
      decisionEmailState: 'delivering',
      decisionEmailSentAt: null,
      decisionEmailDeliveryLeaseToken: 'active-worker',
      decisionEmailDeliveryLeaseExpiresAt: '2026-08-13T12:05:00.000Z'
    }).where(eq(talkProposals.id, 'proposal'))
    const activeMessage = queueMessage(body)
    const activeSend = vi.fn()
    const active = await processTalkProposalDecisionEmailQueueMessage(activeMessage, {
      database: harness.database,
      sendEmail: activeSend,
      now: new Date('2026-08-13T12:00:00.000Z')
    })
    expect(active.reason).toBe('delivery_claim_active')
    expect(activeMessage.retry).toHaveBeenCalledWith({ delaySeconds: 120 })
    expect(activeSend).not.toHaveBeenCalled()
  })

  test('producer failure remains pending and scheduled reconciliation republishes the deterministic delivery', async () => {
    const harness = createApiRouteTestHarness({ routes: [] })
    harnesses.push(harness)
    await seed(harness)
    await harness.database.update(talkProposals).set({
      decisionEmailState: 'pending',
      decisionEmailQueuedAt: null
    }).where(eq(talkProposals.id, 'proposal'))
    const failedProducer = { send: vi.fn().mockRejectedValue(new Error('queue unavailable')) }
    const failed = await enqueuePendingTalkProposalDecisionEmail({
      database: harness.database,
      proposalId: 'proposal',
      cloudflareEnv: { TALK_PROPOSAL_DECISION_EMAIL_QUEUE: failedProducer },
      trigger: 'decision',
      now: new Date('2026-08-13T12:00:00.000Z')
    })
    expect(failed).toMatchObject({ status: 'failed', reason: 'queue_send_error' })
    expect(await harness.database.query.talkProposals.findFirst({ where: eq(talkProposals.id, 'proposal') })).toMatchObject({
      decisionEmailState: 'pending',
      decisionEmailEnqueueAttempts: 1,
      decisionEmailEnqueueLeaseToken: null,
      decisionEmailLastFailureCode: 'queue_send_error'
    })

    const recoveredProducer = { send: vi.fn().mockResolvedValue(undefined) }
    const recovered = await reconcilePendingTalkProposalDecisionEmails({
      database: harness.database,
      cloudflareEnv: { TALK_PROPOSAL_DECISION_EMAIL_QUEUE: recoveredProducer },
      trigger: 'scheduled',
      now: new Date('2026-08-13T12:02:00.000Z')
    })
    expect(recovered).toMatchObject({ status: 'recovered', pendingCount: 1, recoveredCount: 1 })
    expect(recoveredProducer.send).toHaveBeenCalledWith({
      proposalId: 'proposal',
      deliveryId: 'talk-proposal-decision:proposal'
    }, { contentType: 'json' })
    expect(JSON.stringify(recoveredProducer.send.mock.calls)).not.toContain('Private title')
    expect(JSON.stringify(recoveredProducer.send.mock.calls)).not.toContain('Private abstract')
    expect(await harness.database.query.talkProposals.findFirst({ where: eq(talkProposals.id, 'proposal') })).toMatchObject({
      decisionEmailState: 'enqueued',
      decisionEmailEnqueueAttempts: 2,
      decisionEmailLastFailureCode: null
    })
  })

  test('concurrent producer reconciliation claims a pending delivery once', async () => {
    const harness = createApiRouteTestHarness({ routes: [] })
    harnesses.push(harness)
    await seed(harness)
    await harness.database.update(talkProposals).set({
      decisionEmailState: 'pending',
      decisionEmailQueuedAt: null
    }).where(eq(talkProposals.id, 'proposal'))
    const producer = { send: vi.fn().mockResolvedValue(undefined) }
    const results = await Promise.all([
      enqueuePendingTalkProposalDecisionEmail({
        database: harness.database,
        proposalId: 'proposal',
        cloudflareEnv: { TALK_PROPOSAL_DECISION_EMAIL_QUEUE: producer },
        trigger: 'scheduled',
        now: new Date('2026-08-13T12:00:00.000Z')
      }),
      enqueuePendingTalkProposalDecisionEmail({
        database: harness.database,
        proposalId: 'proposal',
        cloudflareEnv: { TALK_PROPOSAL_DECISION_EMAIL_QUEUE: producer },
        trigger: 'scheduled',
        now: new Date('2026-08-13T12:00:00.000Z')
      })
    ])
    expect(producer.send).toHaveBeenCalledTimes(1)
    expect(results.map(result => result.status).sort()).toEqual(['enqueued', 'skipped'])
  })

  test('scheduled reconciliation republishes a stale retryable delivery after Queue retries are exhausted', async () => {
    const harness = createApiRouteTestHarness({ routes: [] })
    harnesses.push(harness)
    await seed(harness)
    await harness.database.update(talkProposals).set({
      decisionEmailState: 'retryable',
      decisionEmailQueuedAt: '2026-08-13T11:00:00.000Z',
      updatedAt: '2026-08-13T11:00:00.000Z'
    }).where(eq(talkProposals.id, 'proposal'))
    const producer = { send: vi.fn().mockResolvedValue(undefined) }
    const result = await reconcilePendingTalkProposalDecisionEmails({
      database: harness.database,
      cloudflareEnv: { TALK_PROPOSAL_DECISION_EMAIL_QUEUE: producer },
      trigger: 'scheduled',
      now: new Date('2026-08-13T12:00:00.000Z')
    })
    expect(result).toMatchObject({ status: 'recovered', recoveredCount: 1 })
    expect(producer.send).toHaveBeenCalledTimes(1)
    expect(await harness.database.query.talkProposals.findFirst({ where: eq(talkProposals.id, 'proposal') })).toMatchObject({
      decisionEmailState: 'enqueued',
      decisionEmailEnqueueAttempts: 1
    })
  })
})
