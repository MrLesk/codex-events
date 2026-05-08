import { requirePlatformActor } from '#server/auth/actor'
import { getDatabase } from '#server/database/client'
import { userApplications } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { ApiError } from '#server/http/api-error'
import { apiData } from '#server/http/api-response'
import { lookupLumaEventGuestByEmail } from '#server/domains/applications/luma-sync-queue'
import {
  assertCurrentApplicationTermsAcceptance,
  assertEventAllowsApplications,
  assertInPersonAttendanceCommitment,
  assertNoExistingApplication,
  assertUserMeetsEventProfileRequirements,
  getInitialApplicationLumaSyncStatus,
  isEventLumaSyncEnabled,
  serializeRegistrationDetailsJson,
  serializeUserApplication,
  submitApplicationBodySchema
} from '#server/domains/applications'
import { finalizeUserApplicationReview } from '#server/domains/applications/review-finalization'
import { getVisibleEventOrThrow, routeIdParamsSchema } from '#server/domains/events'
import { parseValidatedBody, parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (h3Event) => {
  const actor = await requirePlatformActor(h3Event)
  const { eventId } = parseValidatedParams(h3Event, routeIdParamsSchema)
  const body = await parseValidatedBody(h3Event, submitApplicationBodySchema)
  const database = getDatabase(h3Event)
  const event = await getVisibleEventOrThrow(h3Event, eventId)

  assertEventAllowsApplications(event)
  assertUserMeetsEventProfileRequirements(actor.platformUser, event)
  assertInPersonAttendanceCommitment(event, body)
  await assertNoExistingApplication(database, eventId, actor.platformUser.id)
  const currentTermsDocument = await assertCurrentApplicationTermsAcceptance(
    database,
    event,
    body.applicationTermsDocumentId
  )
  const lumaEmail = actor.platformUser.lumaEmail?.trim() ?? ''

  if (isEventLumaSyncEnabled(event) && lumaEmail) {
    const lumaGuestLookup = await lookupLumaEventGuestByEmail({
      lumaEventApiId: event.lumaEventApiId!.trim(),
      lumaEmail
    }, {
      runtimeConfig: useRuntimeConfig(h3Event)
    })

    if (lumaGuestLookup.status === 'not_found') {
      throw new ApiError({
        statusCode: 409,
        code: 'luma_registration_required',
        message: 'Luma registration is mandatory for this event, and we could not find any guest with the Luma email you entered.',
        details: {
          eventId
        }
      })
    }

    if (lumaGuestLookup.status === 'lookup_failed') {
      console.error('Luma registration validation skipped after lookup failure.', {
        eventId,
        userId: actor.platformUser.id,
        reason: lumaGuestLookup.reason
      })
    }
  }

  const registrationDetailsJson = serializeRegistrationDetailsJson(event, {
    registrationTeamIntent: body.registrationTeamIntent,
    registrationTeamMembers: body.registrationTeamMembers,
    inPersonAttendanceCommitment: body.inPersonAttendanceCommitment,
    whyThisEvent: body.whyThisEvent,
    proofOfExecutionUrl: body.proofOfExecutionUrl
  })

  const submittedAt = new Date().toISOString()
  const applicationId = crypto.randomUUID()
  const lumaSyncStatus = getInitialApplicationLumaSyncStatus(event)
  const status = event.autoApproveApplications ? 'approved' : 'submitted'
  const reviewedAt = event.autoApproveApplications ? submittedAt : null

  await database.insert(userApplications).values({
    id: applicationId,
    eventId,
    userId: actor.platformUser.id,
    status,
    preApprovalStatus: null,
    lumaSyncStatus,
    submittedAt,
    reviewedAt,
    reviewedByUserId: null,
    applicationTermsDocumentId: currentTermsDocument.id,
    applicationTermsAcceptedAt: submittedAt,
    registrationDetailsJson,
    createdAt: submittedAt,
    updatedAt: submittedAt
  })

  const applicationRecord: typeof userApplications.$inferSelect = {
    id: applicationId,
    eventId,
    userId: actor.platformUser.id,
    status,
    preApprovalStatus: null,
    lumaSyncStatus,
    submittedAt,
    withdrawnAt: null,
    checkedInAt: null,
    reviewedAt,
    reviewedByUserId: null,
    applicationTermsDocumentId: currentTermsDocument.id,
    applicationTermsAcceptedAt: submittedAt,
    registrationDetailsJson,
    createdAt: submittedAt,
    updatedAt: submittedAt
  }

  if (event.autoApproveApplications) {
    const finalizedReview = await finalizeUserApplicationReview({
      h3Event,
      database,
      event,
      application: applicationRecord,
      applicant: actor.platformUser,
      decision: 'approved',
      reviewedAt: submittedAt,
      reviewedByUserId: null,
      auditActorUserId: null,
      source: 'auto_approval',
      persistReview: false
    })

    applicationRecord.lumaSyncStatus = finalizedReview.lumaSyncStatus
    applicationRecord.updatedAt = finalizedReview.updatedAt
  }

  return apiData(serializeUserApplication({
    ...applicationRecord
  }, {
    applicationTermsDocument: currentTermsDocument
  }))
})
