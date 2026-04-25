import { getDatabase } from '#server/database/client'
import { defineApiHandler } from '#server/utils/api-handler'
import { apiList } from '#server/utils/api-response'
import {
  getPublicHackathonBySlugOrThrow,
  routeSlugParamsSchema
} from '#server/utils/hackathon-management'
import { assertCompletedOutcomeVisible, getPublishedProjectsView } from '#server/utils/shortlist'
import { parseValidatedParams } from '#server/utils/validation'

export default defineApiHandler(async (event) => {
  const { slug } = parseValidatedParams(event, routeSlugParamsSchema)
  const database = getDatabase(event)
  const hackathon = await getPublicHackathonBySlugOrThrow(database, slug)

  assertCompletedOutcomeVisible(hackathon)

  const publishedProjects = await getPublishedProjectsView(database, hackathon.id)

  return apiList(publishedProjects, {
    total: publishedProjects.length
  })
})
