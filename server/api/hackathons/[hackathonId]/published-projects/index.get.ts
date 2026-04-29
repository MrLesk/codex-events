import { getDatabase } from '#server/database/client'
import { defineApiHandler } from '#server/http/api-handler'
import { apiList } from '#server/http/api-response'
import { getVisibleHackathonOrThrow, routeIdParamsSchema } from '#server/domains/hackathons'
import { assertCompletedOutcomeVisible, getPublishedProjectsView } from '#server/domains/outcomes'
import { parseValidatedParams } from '#server/http/validation'

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
