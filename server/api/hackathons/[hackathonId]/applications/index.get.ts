import { defineApiHandler } from '../../../../utils/api-handler'
import { apiList } from '../../../../utils/api-response'
import {
  listHackathonApplications,
  requireHackathonAdminApplicationContext
} from '../../../../utils/applications'
import { parseValidatedParams } from '../../../../utils/validation'
import { routeIdParamsSchema } from '../../../../utils/hackathon-management'

export default defineApiHandler(async (event) => {
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const { database } = await requireHackathonAdminApplicationContext(event, hackathonId)
  const applications = await listHackathonApplications(database, hackathonId)

  return apiList(applications, {
    total: applications.length
  })
})
