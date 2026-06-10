import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '#server/auth/actor'
import { writeAuditLog } from '#server/database/audit-log'
import { userApplications, users } from '#server/database/schema'
import { ApiError } from '#server/http/api-error'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  applicationParamsSchema,
  assertEventAllowsApplications,
  getInitialApplicationLumaSyncStatus,
  getUserApplicationWithTermsOrThrow,
  requireEventAdminApplicationContext,
  serializeUserApplication
} from '#server/domains/applications'
import { applyPostRegistrationApplicationOutcome } from '#server/domains/applications/review-finalization'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (h3Event) => {
  const actor = await requirePlatformActor(h3Event)
  const { eventId, applicationId } = parseValidatedParams(h3Event, applicationParamsSchema)
  const { database, event } = await requireEventAdminApplicationContext(h3Event, eventId)
  const { application, applicationTermsDocument } = await getUserApplicationWithTermsOrThrow(
    database,
    eventId,
    applicationId
  )

  assertEventAllowsApplications(event)

  if (application.status !== 'withdrawn') {
    throw new ApiError({
      statusCode: 409,
      code: 'user_application_state_invalid',
      message: 'Only withdrawn applications can be restored.',
      details: {
        applicationId: application.id
      }
    })
  }

  const restoredAt = new Date().toISOString()
  const lumaSyncStatus = getInitialApplicationLumaSyncStatus(event)
  const restoredApplication = {
    ...application,
    status: 'submitted' as const,
    preApprovalStatus: null,
    lumaSyncStatus,
    withdrawnAt: null,
    checkedInAt: null,
    checkInOverrideStatus: null,
    checkInOverrideAt: null,
    checkInOverrideByUserId: null,
    reviewedAt: null,
    reviewedByUserId: null,
    updatedAt: restoredAt
  }

  await database
    .update(userApplications)
    .set({
      status: restoredApplication.status,
      preApprovalStatus: restoredApplication.preApprovalStatus,
      lumaSyncStatus: restoredApplication.lumaSyncStatus,
      withdrawnAt: restoredApplication.withdrawnAt,
      checkedInAt: restoredApplication.checkedInAt,
      checkInOverrideStatus: restoredApplication.checkInOverrideStatus,
      checkInOverrideAt: restoredApplication.checkInOverrideAt,
      checkInOverrideByUserId: restoredApplication.checkInOverrideByUserId,
      reviewedAt: restoredApplication.reviewedAt,
      reviewedByUserId: restoredApplication.reviewedByUserId,
      updatedAt: restoredApplication.updatedAt
    })
    .where(eq(userApplications.id, application.id))

  const applicant = await database.query.users.findFirst({
    where: eq(users.id, application.userId)
  })

  const applicationRecord = await applyPostRegistrationApplicationOutcome({
    h3Event,
    database,
    event,
    application: restoredApplication,
    applicant: applicant ?? null,
    outcomeAt: restoredAt
  })

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'user_application',
    entityId: application.id,
    action: 'user_application.admin_withdrawal_undone',
    metadata: {
      eventId,
      userId: application.userId,
      previousStatus: 'withdrawn',
      nextStatus: applicationRecord.status
    }
  })

  return apiData(serializeUserApplication(applicationRecord, {
    user: applicant ?? null,
    applicationTermsDocument
  }))
})
