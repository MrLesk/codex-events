import { getDatabase } from '#server/database/client'
import { defineStructuredOperationApiHandler, defineStructuredRouteOperation } from '#server/application/operations/route-operation'
import { apiList } from '#server/http/api-response'
import { listPublicEventPhotoRecords } from '#server/domains/events/photos'
import {
  getPublicEventBySlugOrThrow,
  routeSlugParamsSchema
} from '#server/domains/events'
import { parseValidatedParams } from '#server/http/validation'

export const applicationOperation = defineStructuredRouteOperation({
  id: 'get.public.events.by-slug.photos',
  toolName: 'get_public_events_by_slug_photos',
  description: 'GET /api/public/events/:slug/photos',
  rest: { method: 'GET', path: '/api/public/events/:slug/photos' },
  input: { params: routeSlugParamsSchema },
  output: 'list',
  capabilities: ['public'],
  effect: 'read'
}, async (h3Event) => {
  const { slug } = parseValidatedParams(h3Event, routeSlugParamsSchema)
  const database = getDatabase(h3Event)
  const event = await getPublicEventBySlugOrThrow(database, slug)
  const photos = await listPublicEventPhotoRecords(database, event.id, event.slug)

  return apiList(photos, {
    total: photos.length
  })
})

export default defineStructuredOperationApiHandler(applicationOperation)
