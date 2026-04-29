import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  getTeamWithMembersOrThrow,
  serializeTeam,
  teamParamsSchema,
  requireTeamVisibilityContext
} from '#server/utils/team-formation'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (event) => {
  const { hackathonId, teamId } = parseValidatedParams(event, teamParamsSchema)
  const { database, hackathonAuthorization, membership } = await requireTeamVisibilityContext(event, hackathonId)
  const { team, members } = await getTeamWithMembersOrThrow(database, hackathonId, teamId, {
    includeSensitiveUserFields: hackathonAuthorization.isHackathonAdmin || membership?.teamId === teamId,
    allowInactiveTeam: hackathonAuthorization.canViewParticipantsAndTeams
  })

  return apiData(serializeTeam(team, {
    activeMemberCount: members.length,
    members
  }))
})
