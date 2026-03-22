import { defineApiHandler } from '../../../../../utils/api-handler'
import { apiData } from '../../../../../utils/api-response'
import {
  getTeamWithMembersOrThrow,
  serializeTeam,
  teamParamsSchema,
  requireTeamVisibilityContext
} from '../../../../../utils/team-formation'
import { parseValidatedParams } from '../../../../../utils/validation'

export default defineApiHandler(async (event) => {
  const { hackathonId, teamId } = parseValidatedParams(event, teamParamsSchema)
  const { database } = await requireTeamVisibilityContext(event, hackathonId)
  const { team, members } = await getTeamWithMembersOrThrow(database, hackathonId, teamId)

  return apiData(serializeTeam(team, {
    activeMemberCount: members.length,
    members
  }))
})
