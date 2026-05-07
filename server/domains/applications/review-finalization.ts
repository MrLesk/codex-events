import type { H3Event } from 'h3'

import { eq } from 'drizzle-orm'

import { writeAuditLog } from '#server/database/audit-log'
import type { AppDatabase } from '#server/database/client'
import {
  userApplications,
  type hackathons,
  type users
} from '#server/database/schema'
import { isHackathonLumaSyncEnabled } from '#server/domains/applications'
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
type HackathonRecord = typeof hackathons.$inferSelect
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
  event: H3Event
  database: AppDatabase
  hackathon: Pick<HackathonRecord, 'id' | 'name' | 'slug' | 'requireLumaEmail' | 'lumaEventApiId'>
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
  let lumaSyncStatus: ApplicationLumaSyncStatus = isHackathonLumaSyncEnabled(options.hackathon) ? 'not_synced' : null
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
      hackathonId: options.hackathon.id,
      userId: options.application.userId,
      ...sourceMetadata
    }
  })

  const enqueueResult = await enqueueApplicationReviewEmailMessage(
    options.event,
    buildApplicationReviewEmailQueueMessage({
      applicationId: options.application.id,
      decision: options.decision,
      reviewedAt: options.reviewedAt,
      recipientEmail: options.applicant?.email ?? null,
      recipientDisplayName: options.applicant?.displayName ?? null,
      hackathonName: options.hackathon.name,
      hackathonSlug: options.hackathon.slug
    })
  )

  await writeAuditLog(options.database, {
    actorUserId: options.auditActorUserId,
    entityType: 'user_application',
    entityId: options.application.id,
    action: 'user_application.review_email_enqueued',
    metadata: {
      hackathonId: options.hackathon.id,
      userId: options.application.userId,
      decision: options.decision,
      enqueue: enqueueResult,
      ...sourceMetadata
    }
  })

  if (isHackathonLumaSyncEnabled(options.hackathon)) {
    const lumaEnqueueResult = await enqueueApplicationLumaSyncMessage(
      options.event,
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
        hackathonId: options.hackathon.id,
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
