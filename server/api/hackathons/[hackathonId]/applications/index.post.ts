import { requirePlatformActor } from '#server/auth/actor'
import { getDatabase } from '#server/database/client'
import { userApplications } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { ApiError } from '#server/http/api-error'
import { apiData } from '#server/http/api-response'
import { lookupLumaEventGuestByEmail } from '#server/utils/application-luma-sync-queue'
import {
  assertCurrentApplicationTermsAcceptance,
  assertHackathonAllowsApplications,
  assertInPersonAttendanceCommitment,
  assertNoExistingApplication,
  assertUserMeetsHackathonProfileRequirements,
  getInitialApplicationLumaSyncStatus,
  isHackathonLumaSyncEnabled,
  serializeRegistrationDetailsJson,
  serializeUserApplication,
  submitApplicationBodySchema
} from '#server/domains/applications'
import { getVisibleHackathonOrThrow, routeIdParamsSchema } from '#server/utils/hackathon-management'
import { parseValidatedBody, parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const body = await parseValidatedBody(event, submitApplicationBodySchema)
  const database = getDatabase(event)
  const hackathon = await getVisibleHackathonOrThrow(event, hackathonId)

  assertHackathonAllowsApplications(hackathon)
  assertUserMeetsHackathonProfileRequirements(actor.platformUser, hackathon)
  assertInPersonAttendanceCommitment(hackathon, body)
  await assertNoExistingApplication(database, hackathonId, actor.platformUser.id)
  const currentTermsDocument = await assertCurrentApplicationTermsAcceptance(
    database,
    hackathon,
    body.applicationTermsDocumentId
  )
  const lumaEmail = actor.platformUser.lumaEmail?.trim() ?? ''

  if (isHackathonLumaSyncEnabled(hackathon) && lumaEmail) {
    const lumaGuestLookup = await lookupLumaEventGuestByEmail({
      lumaEventApiId: hackathon.lumaEventApiId!.trim(),
      lumaEmail
    }, {
      runtimeConfig: useRuntimeConfig(event)
    })

    if (lumaGuestLookup.status === 'not_found') {
      throw new ApiError({
        statusCode: 409,
        code: 'luma_registration_required',
        message: 'Luma registration is mandatory for this hackathon, and we could not find any guest with the Luma email you entered.',
        details: {
          hackathonId
        }
      })
    }

    if (lumaGuestLookup.status === 'lookup_failed') {
      console.error('Luma registration validation skipped after lookup failure.', {
        hackathonId,
        userId: actor.platformUser.id,
        reason: lumaGuestLookup.reason
      })
    }
  }

  const registrationDetailsJson = serializeRegistrationDetailsJson(hackathon, {
    registrationTeamIntent: body.registrationTeamIntent,
    registrationTeamMembers: body.registrationTeamMembers,
    inPersonAttendanceCommitment: body.inPersonAttendanceCommitment,
    whyThisHackathon: body.whyThisHackathon,
    proofOfExecutionUrl: body.proofOfExecutionUrl
  })

  const submittedAt = new Date().toISOString()
  const applicationId = crypto.randomUUID()
  const lumaSyncStatus = getInitialApplicationLumaSyncStatus(hackathon)

  await database.insert(userApplications).values({
    id: applicationId,
    hackathonId,
    userId: actor.platformUser.id,
    status: 'submitted',
    preApprovalStatus: null,
    lumaSyncStatus,
    submittedAt,
    applicationTermsDocumentId: currentTermsDocument.id,
    applicationTermsAcceptedAt: submittedAt,
    registrationDetailsJson,
    createdAt: submittedAt,
    updatedAt: submittedAt
  })

  return apiData(serializeUserApplication({
    id: applicationId,
    hackathonId,
    userId: actor.platformUser.id,
    status: 'submitted',
    preApprovalStatus: null,
    lumaSyncStatus,
    submittedAt,
    withdrawnAt: null,
    checkedInAt: null,
    reviewedAt: null,
    reviewedByUserId: null,
    applicationTermsDocumentId: currentTermsDocument.id,
    applicationTermsAcceptedAt: submittedAt,
    registrationDetailsJson,
    createdAt: submittedAt,
    updatedAt: submittedAt
  }, {
    applicationTermsDocument: currentTermsDocument
  }))
})
