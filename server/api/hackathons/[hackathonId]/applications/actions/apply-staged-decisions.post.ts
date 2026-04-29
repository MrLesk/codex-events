import { and, asc, desc, eq, getTableColumns, isNotNull } from 'drizzle-orm'

import { requirePlatformActor } from '#server/auth/actor'
import { writeAuditLog } from '#server/database/audit-log'
import { userApplications, users } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import {
  buildApplicationLumaSyncQueueMessage,
  enqueueApplicationLumaSyncMessage,
  getApplicationLumaSyncFailureStatus
} from '#server/utils/application-luma-sync-queue'
import {
  buildApplicationReviewEmailQueueMessage,
  enqueueApplicationReviewEmailMessage
} from '#server/utils/application-review-email-queue'
import { apiData } from '#server/http/api-response'
import {
  isHackathonLumaSyncEnabled,
  requireHackathonAdminApplicationContext,
  serializeUserApplication
} from '#server/domains/applications'
import { routeIdParamsSchema } from '#server/domains/hackathons'
import { parseValidatedParams } from '#server/http/validation'

type UserApplicationLumaSyncStatus = typeof userApplications.$inferSelect['lumaSyncStatus']

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const { database, hackathon } = await requireHackathonAdminApplicationContext(event, hackathonId)

  const stagedApplications = await database.query.userApplications.findMany({
    where: and(
      eq(userApplications.hackathonId, hackathonId),
      eq(userApplications.status, 'submitted'),
      isNotNull(userApplications.preApprovalStatus)
    ),
    orderBy: [desc(userApplications.submittedAt), asc(userApplications.createdAt)]
  })

  if (stagedApplications.length === 0) {
    return apiData({
      appliedCount: 0,
      approvedCount: 0,
      rejectedCount: 0,
      applications: []
    })
  }

  const applicantsById = new Map<string, typeof users.$inferSelect>()
  const relatedUsers = await database
    .select(getTableColumns(users))
    .from(users)
    .innerJoin(userApplications, eq(userApplications.userId, users.id))
    .where(and(
      eq(userApplications.hackathonId, hackathonId),
      eq(userApplications.status, 'submitted'),
      isNotNull(userApplications.preApprovalStatus)
    ))

  for (const user of relatedUsers) {
    applicantsById.set(user.id, user)
  }

  const appliedApplications: ReturnType<typeof serializeUserApplication>[] = []
  let approvedCount = 0
  let rejectedCount = 0
  const shouldSyncLuma = isHackathonLumaSyncEnabled(hackathon)

  for (const application of stagedApplications) {
    const decision = application.preApprovalStatus

    if (decision !== 'approved' && decision !== 'rejected') {
      continue
    }

    const reviewedAt = new Date().toISOString()
    let lumaSyncStatus: UserApplicationLumaSyncStatus = shouldSyncLuma ? 'not_synced' : null
    let updatedAt = reviewedAt

    await database
      .update(userApplications)
      .set({
        status: decision,
        preApprovalStatus: null,
        lumaSyncStatus,
        reviewedAt,
        reviewedByUserId: actor.platformUser.id,
        updatedAt
      })
      .where(eq(userApplications.id, application.id))

    await writeAuditLog(database, {
      actorUserId: actor.platformUser.id,
      entityType: 'user_application',
      entityId: application.id,
      action: decision === 'approved' ? 'user_application.approved' : 'user_application.rejected',
      metadata: {
        hackathonId,
        userId: application.userId,
        appliedFromStage: 'pre_approval'
      }
    })

    const applicant = applicantsById.get(application.userId)
    const enqueueResult = await enqueueApplicationReviewEmailMessage(event, buildApplicationReviewEmailQueueMessage({
      applicationId: application.id,
      decision,
      reviewedAt,
      recipientEmail: applicant?.email ?? null,
      recipientDisplayName: applicant?.displayName ?? null,
      hackathonName: hackathon.name,
      hackathonSlug: hackathon.slug
    }))

    await writeAuditLog(database, {
      actorUserId: actor.platformUser.id,
      entityType: 'user_application',
      entityId: application.id,
      action: 'user_application.review_email_enqueued',
      metadata: {
        hackathonId,
        userId: application.userId,
        decision,
        enqueue: enqueueResult,
        appliedFromStage: 'pre_approval'
      }
    })

    if (shouldSyncLuma) {
      const lumaEnqueueResult = await enqueueApplicationLumaSyncMessage(
        event,
        buildApplicationLumaSyncQueueMessage({
          applicationId: application.id,
          decision
        })
      )

      if (lumaEnqueueResult.status !== 'enqueued') {
        lumaSyncStatus = getApplicationLumaSyncFailureStatus(decision)
        updatedAt = new Date().toISOString()

        await database
          .update(userApplications)
          .set({
            lumaSyncStatus,
            updatedAt
          })
          .where(eq(userApplications.id, application.id))
      }

      await writeAuditLog(database, {
        actorUserId: actor.platformUser.id,
        entityType: 'user_application',
        entityId: application.id,
        action: 'user_application.luma_sync_enqueued',
        metadata: {
          hackathonId,
          userId: application.userId,
          decision,
          enqueue: lumaEnqueueResult,
          appliedFromStage: 'pre_approval'
        }
      })
    }

    if (decision === 'approved') {
      approvedCount += 1
    } else {
      rejectedCount += 1
    }

    appliedApplications.push(serializeUserApplication({
      ...application,
      status: decision,
      preApprovalStatus: null,
      lumaSyncStatus,
      reviewedAt,
      reviewedByUserId: actor.platformUser.id,
      updatedAt
    }, {
      user: applicant ?? null
    }))
  }

  return apiData({
    appliedCount: appliedApplications.length,
    approvedCount,
    rejectedCount,
    applications: appliedApplications
  })
})
