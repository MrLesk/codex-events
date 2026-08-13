import { getDatabase } from '#server/database/client'
import { defineStructuredOperationApiHandler, defineStructuredRouteOperation } from '#server/application/operations/route-operation'
import { apiList } from '#server/http/api-response'
import {
  getPublicEventBySlugOrThrow,
  routeSlugParamsSchema
} from '#server/domains/events'
import { assertCompletedOutcomeVisible, getPublishedProjectsView } from '#server/domains/outcomes'
import { parseValidatedParams } from '#server/http/validation'

export const applicationOperation = defineStructuredRouteOperation({
  id: 'get.public.events.by-slug.published-projects',
  toolName: 'get_public_events_by_slug_published-projects',
  description: 'GET /api/public/events/:slug/published-projects',
  rest: { method: 'GET', path: '/api/public/events/:slug/published-projects' },
  input: { params: routeSlugParamsSchema },
  output: 'list',
  capabilities: ['public'],
  effect: 'read'
}, async (h3Event) => {
  const { slug } = parseValidatedParams(h3Event, routeSlugParamsSchema)
  const database = getDatabase(h3Event)
  const event = await getPublicEventBySlugOrThrow(database, slug)

  assertCompletedOutcomeVisible(event)

  const publishedProjects = await getPublishedProjectsView(database, event.id)

  return apiList(publishedProjects, {
    total: publishedProjects.length
  })
})

export default defineStructuredOperationApiHandler(applicationOperation)
