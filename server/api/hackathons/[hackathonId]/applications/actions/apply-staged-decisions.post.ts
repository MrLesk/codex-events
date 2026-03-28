import { and, asc, desc, eq, inArray, isNotNull } from 'drizzle-orm'

import { requirePlatformActor } from '../../../../../auth/actor'
import { writeAuditLog } from '../../../../../database/audit-log'
import { userApplications, users } from '../../../../../database/schema'
import { defineApiHandler } from '../../../../../utils/api-handler'
import {
  buildApplicationReviewEmailQueueMessage,
  enqueueApplicationReviewEmailMessage
} from '../../../../../utils/application-review-email-queue'
import { apiData } from '../../../../../utils/api-response'
import {
  requireHackathonAdminApplicationContext,
  serializeUserApplication
} from '../../../../../utils/applications'
import { routeIdParamsSchema } from '../../../../../utils/hackathon-management'
import { parseValidatedParams } from '../../../../../utils/validation'

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
  const relatedUsers = await database.query.users.findMany({
    where: inArray(users.id, stagedApplications.map(application => application.userId))
  })

  for (const user of relatedUsers) {
    applicantsById.set(user.id, user)
  }

  const appliedApplications: ReturnType<typeof serializeUserApplication>[] = []
  let approvedCount = 0
  let rejectedCount = 0

  for (const application of stagedApplications) {
    const decision = application.preApprovalStatus

    if (decision !== 'approved' && decision !== 'rejected') {
      continue
    }

    const reviewedAt = new Date().toISOString()

    await database
      .update(userApplications)
      .set({
        status: decision,
        preApprovalStatus: null,
        reviewedAt,
        reviewedByUserId: actor.platformUser.id,
        updatedAt: reviewedAt
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

    if (decision === 'approved') {
      approvedCount += 1
    } else {
      rejectedCount += 1
    }

    appliedApplications.push(serializeUserApplication({
      ...application,
      status: decision,
      preApprovalStatus: null,
      reviewedAt,
      reviewedByUserId: actor.platformUser.id,
      updatedAt: reviewedAt
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
