import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '#server/auth/actor'
import { writeAuditLog } from '#server/database/audit-log'
import { userApplications } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  assertApplicationReviewable,
  applicationParamsSchema,
  getUserApplicationWithTermsOrThrow,
  requireEventAdminApplicationContext,
  serializeUserApplication
} from '#server/domains/applications'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (h3Event) => {
  const actor = await requirePlatformActor(h3Event)
  const { eventId, applicationId } = parseValidatedParams(h3Event, applicationParamsSchema)
  const { database } = await requireEventAdminApplicationContext(h3Event, eventId)
  const { application, applicationTermsDocument } = await getUserApplicationWithTermsOrThrow(
    database,
    eventId,
    applicationId
  )

  assertApplicationReviewable(application)

  const updatedAt = new Date().toISOString()
  const nextPreApprovalStatus = application.preApprovalStatus === 'approved'
    ? null
    : 'approved'

  await database
    .update(userApplications)
    .set({
      preApprovalStatus: nextPreApprovalStatus,
      updatedAt
    })
    .where(eq(userApplications.id, application.id))

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'user_application',
    entityId: application.id,
    action: nextPreApprovalStatus === 'approved'
      ? 'user_application.review_decision_staged'
      : 'user_application.review_decision_cleared',
    metadata: {
      eventId,
      userId: application.userId,
      decision: nextPreApprovalStatus,
      previousDecision: application.preApprovalStatus,
      stage: 'pre_approval'
    }
  })

  return apiData(serializeUserApplication({
    ...application,
    preApprovalStatus: nextPreApprovalStatus,
    updatedAt
  }, {
    applicationTermsDocument
  }))
})
