import { defineApiHandler } from '#server/http/api-handler'
import { apiList } from '#server/http/api-response'
import {
  assertCompetitionEvent,
  listPublishedEventRosterMembers,
  requireEventWorkspaceAccess,
  routeIdParamsSchema
} from '#server/domains/events'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (h3Event) => {
  const { eventId } = parseValidatedParams(h3Event, routeIdParamsSchema)
  const { database, event } = await requireEventWorkspaceAccess(h3Event, eventId)
  assertCompetitionEvent(event)
  const judges = await listPublishedEventRosterMembers(database, eventId, 'judge')

  return apiList(judges, {
    total: judges.length
  })
})
