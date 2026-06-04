import { requirePlatformActor } from '#server/auth/actor'
import { defineApiHandler } from '#server/http/api-handler'
import { ApiError } from '#server/http/api-error'
import { apiData } from '#server/http/api-response'
import {
  applicationParamsSchema,
  assertApplicationWithdrawable,
  getUserApplicationWithTermsOrThrow,
  requireEventAdminApplicationContext,
  serializeUserApplication,
  withdrawUserApplicationWithAdminPolicy
} from '#server/domains/applications'
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

  assertApplicationWithdrawable(application)

  const withdrawalResult = await withdrawUserApplicationWithAdminPolicy({
    h3Event,
    database,
    event,
    application,
    actorUserId: actor.platformUser.id,
    trigger: 'admin_withdrawal'
  })

  if (withdrawalResult.status === 'blocked') {
    throw new ApiError({
      statusCode: 409,
      code: 'user_application_admin_withdrawal_blocked',
      message: withdrawalResult.withdrawalPlan.reason ?? 'This participant cannot be withdrawn right now.',
      details: {
        eventId,
        applicationId: application.id,
        userId: application.userId,
        activeTeamId: withdrawalResult.withdrawalPlan.activeTeamId,
        teamAction: withdrawalResult.withdrawalPlan.teamAction
      }
    })
  }

  return apiData(serializeUserApplication(withdrawalResult.application, {
    applicationTermsDocument
  }))
})
