import { getDatabase } from '#server/database/client'
import { defineApiHandler } from '#server/http/api-handler'
import { apiList } from '#server/http/api-response'
import {
  getPublicHackathonBySlugOrThrow,
  routeSlugParamsSchema
} from '#server/domains/hackathons'
import { assertCompletedOutcomeVisible, getPublishedProjectsView } from '#server/domains/outcomes'
import { parseValidatedParams } from '#server/http/validation'

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
