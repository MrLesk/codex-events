import { defineStructuredOperationApiHandler, defineStructuredRouteOperation } from '#server/application/operations/route-operation'
import { apiData } from '#server/http/api-response'
import { listOwnEventParticipation } from '#server/domains/events/participation'

export const applicationOperation = defineStructuredRouteOperation({
  id: 'get.events.participation',
  toolName: 'get_events_participation',
  description: 'GET /api/events/participation',
  rest: { method: 'GET', path: '/api/events/participation' },
  input: {},
  output: 'data',
  capabilities: ['platform_user'],
  effect: 'read'
}, async (h3Event) => {
  const participation = await listOwnEventParticipation(h3Event)

  return apiData(participation)
})

export default defineStructuredOperationApiHandler(applicationOperation)
