import { requirePlatformActor } from '#server/auth/actor'
import { defineApiHandler } from '#server/http/api-handler'
import { apiList } from '#server/http/api-response'
import {
  listTeamJoinRequests,
  requireTeamAdminContext,
  teamParamsSchema
} from '#server/domains/teams'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (event) => {
  await requirePlatformActor(event)
  const { hackathonId, teamId } = parseValidatedParams(event, teamParamsSchema)
  const { database } = await requireTeamAdminContext(event, hackathonId, teamId)
  const requests = await listTeamJoinRequests(database, teamId)

  return apiList(requests, {
    total: requests.length
  })
})
