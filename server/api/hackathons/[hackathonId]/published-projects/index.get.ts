import { getDatabase } from '#server/database/client'
import { defineApiHandler } from '#server/utils/api-handler'
import { apiList } from '#server/utils/api-response'
import { getVisibleHackathonOrThrow, routeIdParamsSchema } from '#server/utils/hackathon-management'
import { assertCompletedOutcomeVisible, getPublishedProjectsView } from '#server/utils/shortlist'
import { parseValidatedParams } from '#server/utils/validation'

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
