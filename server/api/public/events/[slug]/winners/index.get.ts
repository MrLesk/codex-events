import { getDatabase } from '#server/database/client'
import { defineStructuredOperationApiHandler, defineStructuredRouteOperation } from '#server/application/operations/route-operation'
import { apiList } from '#server/http/api-response'
import {
  getPublicEventBySlugOrThrow,
  routeSlugParamsSchema
} from '#server/domains/events'
import { assertWinnersVisible, getWinnersView } from '#server/domains/outcomes'
import { parseValidatedParams } from '#server/http/validation'

export const applicationOperation = defineStructuredRouteOperation({
  id: 'get.public.events.by-slug.winners',
  toolName: 'get_public_events_by_slug_winners',
  description: 'GET /api/public/events/:slug/winners',
  rest: { method: 'GET', path: '/api/public/events/:slug/winners' },
  input: { params: routeSlugParamsSchema },
  output: 'list',
  capabilities: ['public'],
  effect: 'read'
}, async (h3Event) => {
  const { slug } = parseValidatedParams(h3Event, routeSlugParamsSchema)
  const database = getDatabase(h3Event)
  const event = await getPublicEventBySlugOrThrow(database, slug)

  assertWinnersVisible(event)

  const winners = await getWinnersView(database, event.id)

  return apiList(winners, {
    total: winners.length
  })
})

export default defineStructuredOperationApiHandler(applicationOperation)
