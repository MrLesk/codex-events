import { requirePlatformActor } from '#server/auth/actor'
import { resolveEventAuthorization } from '#server/auth/authorization'
import { getDatabase } from '#server/database/client'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import { getVisibleEventOrThrow, routeIdParamsSchema } from '#server/domains/events'
import { assertGuard } from '#server/domains/lifecycle-guard'
import {
  assertFinalDeliberationViewAllowed,
  getFinalDeliberationView
} from '#server/domains/outcomes'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (h3Event) => {
  await requirePlatformActor(h3Event)
  const { eventId } = parseValidatedParams(h3Event, routeIdParamsSchema)
  const database = getDatabase(h3Event)
  const event = await getVisibleEventOrThrow(h3Event, eventId)
  const authorization = await resolveEventAuthorization(h3Event, eventId)
  const canViewFinalDeliberation = authorization.isPlatformAdmin
    || authorization.isEventAdmin
    || authorization.canReviewThroughAssignment

  assertGuard(canViewFinalDeliberation, {
    statusCode: 403,
    code: 'final_deliberation_access_denied',
    message: 'This operation requires judge or event admin access.',
    details: { eventId }
  })
  assertFinalDeliberationViewAllowed(event)

  return apiData(await getFinalDeliberationView(database, eventId))
})
