import { getDatabase } from '../../../../database/client'
import { defineApiHandler } from '../../../../utils/api-handler'
import { apiList } from '../../../../utils/api-response'
import { getVisibleHackathonOrThrow, routeIdParamsSchema } from '../../../../utils/hackathon-management'
import { assertCompletedOutcomeVisible, getPublishedProjectsView } from '../../../../utils/shortlist'
import { parseValidatedParams } from '../../../../utils/validation'

export default defineApiHandler(async (event) => {
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const database = getDatabase(event)
  const hackathon = await getVisibleHackathonOrThrow(event, hackathonId)

  assertCompletedOutcomeVisible(hackathon)

  const publishedProjects = await getPublishedProjectsView(database, hackathonId)

  return apiList(publishedProjects, {
    total: publishedProjects.length
  })
})
