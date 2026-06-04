import type { H3Event } from 'h3'

import { eq } from 'drizzle-orm'

import { writeAuditLog } from '#server/database/audit-log'
import type { AppDatabase } from '#server/database/client'
import {
  userApplications,
  type events,
  type users
} from '#server/database/schema'
import { isEventLumaSyncEnabled } from '#server/domains/applications'
import {
  buildApplicationLumaSyncQueueMessage,
  enqueueApplicationLumaSyncMessage,
  getApplicationLumaSyncFailureStatus,
  type ApplicationLumaSyncStatus
} from '#server/domains/applications/luma-sync-queue'
import {
  buildApplicationReviewEmailQueueMessage,
  enqueueApplicationReviewEmailMessage
} from '#server/domains/applications/review-email-queue'
import type { ApplicationReviewDecision } from '#server/domains/applications/review-emails'

type UserApplicationRecord = typeof userApplications.$inferSelect
type EventRecord = typeof events.$inferSelect
type UserRecord = typeof users.$inferSelect

export type ApplicationReviewSource = 'pre_approval' | 'auto_approval'

function getReviewSourceMetadata(source: ApplicationReviewSource) {
  return source === 'pre_approval'
    ? {
        reviewSource: source,
        appliedFromStage: 'pre_approval'
      }
    : {
        reviewSource: source
      }
}

export async function finalizeUserApplicationReview(options: {
  h3Event: H3Event
  database: AppDatabase
  event: Pick<EventRecord, 'id' | 'name' | 'slug' | 'applicationLumaEmailVisible' | 'requireLumaEmail' | 'lumaEventApiId' | 'lumaApiKey' | 'lumaWebhookSecret' | 'lumaWebhookStatus'>
  application: UserApplicationRecord
  applicant: Pick<UserRecord, 'email' | 'displayName'> | null
  decision: ApplicationReviewDecision
  reviewedAt: string
  reviewedByUserId: string | null
  auditActorUserId: string | null
  source: ApplicationReviewSource
  persistReview: boolean
}) {
  const sourceMetadata = getReviewSourceMetadata(options.source)
  let lumaSyncStatus: ApplicationLumaSyncStatus = isEventLumaSyncEnabled(options.event) ? 'not_synced' : null
  let updatedAt = options.reviewedAt

  if (options.persistReview) {
    await options.database
      .update(userApplications)
      .set({
        status: options.decision,
        preApprovalStatus: null,
        lumaSyncStatus,
        reviewedAt: options.reviewedAt,
        reviewedByUserId: options.reviewedByUserId,
        updatedAt
      })
      .where(eq(userApplications.id, options.application.id))
  }

  await writeAuditLog(options.database, {
    actorUserId: options.auditActorUserId,
    entityType: 'user_application',
    entityId: options.application.id,
    action: options.decision === 'approved' ? 'user_application.approved' : 'user_application.rejected',
    metadata: {
      eventId: options.event.id,
      userId: options.application.userId,
      ...sourceMetadata
    }
  })

  const enqueueResult = await enqueueApplicationReviewEmailMessage(
    options.h3Event,
    buildApplicationReviewEmailQueueMessage({
      applicationId: options.application.id,
      decision: options.decision,
      reviewedAt: options.reviewedAt,
      recipientEmail: options.applicant?.email ?? null,
      recipientDisplayName: options.applicant?.displayName ?? null,
      eventName: options.event.name,
      eventSlug: options.event.slug
    })
  )

  await writeAuditLog(options.database, {
    actorUserId: options.auditActorUserId,
    entityType: 'user_application',
    entityId: options.application.id,
    action: 'user_application.review_email_enqueued',
    metadata: {
      eventId: options.event.id,
      userId: options.application.userId,
      decision: options.decision,
      enqueue: enqueueResult,
      ...sourceMetadata
    }
  })

  if (isEventLumaSyncEnabled(options.event)) {
    const lumaEnqueueResult = await enqueueApplicationLumaSyncMessage(
      options.h3Event,
      buildApplicationLumaSyncQueueMessage({
        applicationId: options.application.id,
        decision: options.decision
      })
    )

    if (lumaEnqueueResult.status !== 'enqueued') {
      lumaSyncStatus = getApplicationLumaSyncFailureStatus(options.decision)
      updatedAt = new Date().toISOString()

      await options.database
        .update(userApplications)
        .set({
          lumaSyncStatus,
          updatedAt
        })
        .where(eq(userApplications.id, options.application.id))
    }

    await writeAuditLog(options.database, {
      actorUserId: options.auditActorUserId,
      entityType: 'user_application',
      entityId: options.application.id,
      action: 'user_application.luma_sync_enqueued',
      metadata: {
        eventId: options.event.id,
        userId: options.application.userId,
        decision: options.decision,
        enqueue: lumaEnqueueResult,
        ...sourceMetadata
      }
    })
  }

  return {
    lumaSyncStatus,
    updatedAt
  }
}
