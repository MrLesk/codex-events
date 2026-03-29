import { requirePlatformActor } from '../../../../auth/actor'
import { getDatabase } from '../../../../database/client'
import { userApplications } from '../../../../database/schema'
import { defineApiHandler } from '../../../../utils/api-handler'
import { apiData } from '../../../../utils/api-response'
import {
  assertCurrentApplicationTermsAcceptance,
  assertHackathonAllowsApplications,
  assertInPersonAttendanceCommitment,
  assertNoExistingApplication,
  assertUserMeetsHackathonProfileRequirements,
  serializeRegistrationDetailsJson,
  serializeUserApplication,
  submitApplicationBodySchema
} from '../../../../utils/applications'
import { getVisibleHackathonOrThrow, routeIdParamsSchema } from '../../../../utils/hackathon-management'
import { parseValidatedBody, parseValidatedParams } from '../../../../utils/validation'

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
  const registrationDetailsJson = serializeRegistrationDetailsJson(hackathon, {
    registrationTeamIntent: body.registrationTeamIntent,
    registrationTeamMembers: body.registrationTeamMembers,
    inPersonAttendanceCommitment: body.inPersonAttendanceCommitment,
    whyThisHackathon: body.whyThisHackathon,
    proofOfExecutionUrl: body.proofOfExecutionUrl
  })

  const submittedAt = new Date().toISOString()
  const applicationId = crypto.randomUUID()

  await database.insert(userApplications).values({
    id: applicationId,
    hackathonId,
    userId: actor.platformUser.id,
    status: 'submitted',
    preApprovalStatus: null,
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
    submittedAt,
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
