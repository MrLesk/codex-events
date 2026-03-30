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
  const { database, hackathonAuthorization, membership } = await requireTeamVisibilityContext(event, hackathonId)
  const { team, members } = await getTeamWithMembersOrThrow(database, hackathonId, teamId, {
    includeSensitiveUserFields: hackathonAuthorization.isHackathonAdmin || membership?.teamId === teamId
  })

  return apiData(serializeTeam(team, {
    activeMemberCount: members.length,
    members
  }))
})
