import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  getTeamWithMembersOrThrow,
  serializeTeam,
  teamParamsSchema,
  requireTeamVisibilityContext
} from '#server/domains/teams'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (h3Event) => {
  const { eventId, teamId } = parseValidatedParams(h3Event, teamParamsSchema)
  const { database, eventAuthorization, membership } = await requireTeamVisibilityContext(h3Event, eventId)
  const { team, members } = await getTeamWithMembersOrThrow(database, eventId, teamId, {
    includeSensitiveUserFields: eventAuthorization.isEventAdmin || membership?.teamId === teamId,
    allowInactiveTeam: eventAuthorization.canViewParticipantsAndTeams
  })

  return apiData(serializeTeam(team, {
    activeMemberCount: members.length,
    members
  }))
})
