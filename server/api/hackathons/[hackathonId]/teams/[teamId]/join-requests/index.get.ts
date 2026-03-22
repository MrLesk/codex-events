import { requirePlatformActor } from '../../../../../../auth/actor'
import { defineApiHandler } from '../../../../../../utils/api-handler'
import { apiList } from '../../../../../../utils/api-response'
import {
  listTeamJoinRequests,
  requireTeamAdminContext,
  teamParamsSchema
} from '../../../../../../utils/team-formation'
import { parseValidatedParams } from '../../../../../../utils/validation'

export default defineApiHandler(async (event) => {
  await requirePlatformActor(event)
  const { hackathonId, teamId } = parseValidatedParams(event, teamParamsSchema)
  const { database } = await requireTeamAdminContext(event, hackathonId, teamId)
  const requests = await listTeamJoinRequests(database, teamId)

  return apiList(requests, {
    total: requests.length
  })
})
