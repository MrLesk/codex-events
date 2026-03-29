import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '../../../../../../auth/actor'
import { writeAuditLog } from '../../../../../../database/audit-log'
import { userApplications } from '../../../../../../database/schema'
import { defineApiHandler } from '../../../../../../utils/api-handler'
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
  const { database } = await requireHackathonAdminApplicationContext(event, hackathonId)
  const { application, applicationTermsDocument } = await getUserApplicationWithTermsOrThrow(
    database,
    hackathonId,
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
      hackathonId,
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
