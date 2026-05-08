import { requirePlatformActor } from '#server/auth/actor'
import { defineApiHandler } from '#server/http/api-handler'
import { apiList } from '#server/http/api-response'
import {
  listTeamJoinRequests,
  requireTeamAdminContext,
  teamParamsSchema
} from '#server/domains/teams'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (h3Event) => {
  await requirePlatformActor(h3Event)
  const { eventId, teamId } = parseValidatedParams(h3Event, teamParamsSchema)
  const { database } = await requireTeamAdminContext(h3Event, eventId, teamId)
  const requests = await listTeamJoinRequests(database, teamId)

  return apiList(requests, {
    total: requests.length
  })
})
