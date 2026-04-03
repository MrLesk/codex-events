import { defineApiHandler } from '../../../../utils/api-handler'
import { apiList } from '../../../../utils/api-response'
import {
  listPublishedHackathonRosterMembers,
  requireHackathonWorkspaceAccess,
  routeIdParamsSchema
} from '../../../../utils/hackathon-management'
import { parseValidatedParams } from '../../../../utils/validation'

export default defineApiHandler(async (event) => {
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const { database } = await requireHackathonWorkspaceAccess(event, hackathonId)
  const judges = await listPublishedHackathonRosterMembers(database, hackathonId, 'judge')

  return apiList(judges, {
    total: judges.length
  })
})
