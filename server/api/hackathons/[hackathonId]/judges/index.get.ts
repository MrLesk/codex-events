import { defineApiHandler } from '#server/http/api-handler'
import { apiList } from '#server/http/api-response'
import {
  listPublishedHackathonRosterMembers,
  requireHackathonWorkspaceAccess,
  routeIdParamsSchema
} from '#server/utils/hackathon-management'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (event) => {
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const { database } = await requireHackathonWorkspaceAccess(event, hackathonId)
  const judges = await listPublishedHackathonRosterMembers(database, hackathonId, 'judge')

  return apiList(judges, {
    total: judges.length
  })
})
