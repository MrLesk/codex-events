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
