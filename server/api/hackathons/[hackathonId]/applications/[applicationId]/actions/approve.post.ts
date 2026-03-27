import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '../../../../../../auth/actor'
import { writeAuditLog } from '../../../../../../database/audit-log'
import { userApplications, users } from '../../../../../../database/schema'
import { defineApiHandler } from '../../../../../../utils/api-handler'
import {
  buildApplicationReviewEmailQueueMessage,
  enqueueApplicationReviewEmailMessage
} from '../../../../../../utils/application-review-email-queue'
import { apiData } from '../../../../../../utils/api-response'
import {
  assertApplicationReviewable,
  applicationParamsSchema,
  getUserApplicationWithTermsOrThrow,
  requireHackathonAdminApplicationContext,
  serializeUserApplication
} from '../../../../../../utils/applications'
import { parseValidatedParams } from '../../../../../../utils/validation'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const { hackathonId, applicationId } = parseValidatedParams(event, applicationParamsSchema)
  const { database, hackathon } = await requireHackathonAdminApplicationContext(event, hackathonId)
  const { application, applicationTermsDocument } = await getUserApplicationWithTermsOrThrow(
    database,
    hackathonId,
    applicationId
  )
  const applicant = await database.query.users.findFirst({
    where: eq(users.id, application.userId)
  })

  assertApplicationReviewable(application)

  const reviewedAt = new Date().toISOString()

  await database
    .update(userApplications)
    .set({
      status: 'approved',
      reviewedAt,
      reviewedByUserId: actor.platformUser.id,
      updatedAt: reviewedAt
    })
    .where(eq(userApplications.id, application.id))

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'user_application',
    entityId: application.id,
    action: 'user_application.approved',
    metadata: {
      hackathonId,
      userId: application.userId
    }
  })
  const enqueueResult = await enqueueApplicationReviewEmailMessage(event, buildApplicationReviewEmailQueueMessage({
    applicationId: application.id,
    decision: 'approved',
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
      decision: 'approved',
      enqueue: enqueueResult
    }
  })

  return apiData(serializeUserApplication({
    ...application,
    status: 'approved',
    reviewedAt,
    reviewedByUserId: actor.platformUser.id,
    updatedAt: reviewedAt
  }, {
    applicationTermsDocument
  }))
})
