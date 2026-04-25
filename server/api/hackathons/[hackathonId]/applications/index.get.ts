import { defineApiHandler } from '#server/utils/api-handler'
import { apiList } from '#server/utils/api-response'
import {
  listHackathonApplications,
  requireHackathonApplicationVisibilityContext
} from '#server/utils/applications'
import { parseValidatedParams } from '#server/utils/validation'
import { routeIdParamsSchema } from '#server/utils/hackathon-management'

export default defineApiHandler(async (event) => {
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const { database } = await requireHackathonApplicationVisibilityContext(event, hackathonId)
  const applications = await listHackathonApplications(database, hackathonId)

  return apiList(applications, {
    total: applications.length
  })
})
