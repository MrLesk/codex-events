import { eq } from 'drizzle-orm'

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
import { applyPostRegistrationApplicationOutcome } from '#server/domains/applications/review-finalization'
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
      lumaApiKey: event.lumaApiKey!.trim(),
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
    proofOfExecutionUrl: body.proofOfExecutionUrl,
    aiKnowledgeLevel: body.aiKnowledgeLevel
  })

  const submittedAt = new Date().toISOString()
  const applicationId = crypto.randomUUID()
  const lumaSyncStatus = getInitialApplicationLumaSyncStatus(event)

  await database.insert(userApplications).values({
    id: applicationId,
    eventId,
    userId: actor.platformUser.id,
    status: 'submitted',
    preApprovalStatus: null,
    lumaSyncStatus,
    submittedAt,
    reviewedAt: null,
    reviewedByUserId: null,
    applicationTermsDocumentId: currentTermsDocument?.id ?? null,
    applicationTermsAcceptedAt: currentTermsDocument ? submittedAt : null,
    registrationDetailsJson,
    createdAt: submittedAt,
    updatedAt: submittedAt
  })

  const createdApplication = await database.query.userApplications.findFirst({
    where: eq(userApplications.id, applicationId)
  })

  if (!createdApplication) {
    throw new ApiError({
      statusCode: 500,
      code: 'user_application_creation_failed',
      message: 'The application could not be created.',
      details: {
        eventId,
        userId: actor.platformUser.id
      }
    })
  }

  const applicationRecord = await applyPostRegistrationApplicationOutcome({
    h3Event,
    database,
    event,
    application: createdApplication,
    applicant: actor.platformUser,
    outcomeAt: submittedAt
  })

  return apiData(serializeUserApplication({
    ...applicationRecord
  }, {
    applicationTermsDocument: currentTermsDocument
  }))
})
