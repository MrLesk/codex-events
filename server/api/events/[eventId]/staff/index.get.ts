import { defineApiHandler } from '#server/http/api-handler'
import { apiList } from '#server/http/api-response'
import {
  listPublishedEventRosterMembers,
  requireEventWorkspaceAccess,
  routeIdParamsSchema
} from '#server/domains/events'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (h3Event) => {
  const { eventId } = parseValidatedParams(h3Event, routeIdParamsSchema)
  const { database } = await requireEventWorkspaceAccess(h3Event, eventId)
  const staff = await listPublishedEventRosterMembers(database, eventId, 'staff')

  return apiList(staff, {
    total: staff.length
  })
})
