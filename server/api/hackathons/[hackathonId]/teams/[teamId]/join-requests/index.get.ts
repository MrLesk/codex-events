import { requirePlatformActor } from '#server/auth/actor'
import { defineApiHandler } from '#server/utils/api-handler'
import { apiList } from '#server/utils/api-response'
import {
  listTeamJoinRequests,
  requireTeamAdminContext,
  teamParamsSchema
} from '#server/utils/team-formation'
import { parseValidatedParams } from '#server/utils/validation'

export default defineApiHandler(async (event) => {
  await requirePlatformActor(event)
  const { hackathonId, teamId } = parseValidatedParams(event, teamParamsSchema)
  const { database } = await requireTeamAdminContext(event, hackathonId, teamId)
  const requests = await listTeamJoinRequests(database, teamId)

  return apiList(requests, {
    total: requests.length
  })
})
