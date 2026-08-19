import { defineStructuredOperationApiHandler, defineStructuredRouteOperation } from '#server/application/operations/route-operation'
import { parseValidatedParams } from '#server/http/validation'
import { routeSlugParamsSchema } from '#server/domains/events'
import { executeAccountEventPageRoute } from '#server/domains/events/account-event-page-contract'
import { accountEventRostersPageRoute } from '#server/domains/events/account-event-rosters-page'

export const applicationOperation = defineStructuredRouteOperation({
  id: 'get.account.events.by-slug.rosters',
  toolName: 'get_account_events_by_slug_rosters',
  description: 'GET /api/account/events/:slug/rosters',
  rest: { method: 'GET', path: '/api/account/events/:slug/rosters' },
  input: { params: routeSlugParamsSchema },
  output: 'data',
  capabilities: ['event_staff', 'event_admin'],
  effect: 'read'
}, async (h3Event) => {
  const { slug } = parseValidatedParams(h3Event, routeSlugParamsSchema)
  return await executeAccountEventPageRoute(h3Event, slug, accountEventRostersPageRoute)
})

export default defineStructuredOperationApiHandler(applicationOperation)
