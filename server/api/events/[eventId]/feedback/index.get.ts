import { resolveEventAuthorization } from '#server/auth/authorization'
import { getDatabase } from '#server/database/client'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  assertEventFeedbackResultsAccess,
  getEventFeedbackSummary
} from '#server/domains/events/feedback'
import {
  getEventOrThrow,
  routeIdParamsSchema
} from '#server/domains/events'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (h3Event) => {
  const { eventId } = parseValidatedParams(h3Event, routeIdParamsSchema)
  const authorization = await resolveEventAuthorization(h3Event, eventId)

  assertEventFeedbackResultsAccess(authorization)

  const database = getDatabase(h3Event)
  const event = await getEventOrThrow(database, eventId)

  return apiData(await getEventFeedbackSummary(database, eventId, event.eventType))
})
