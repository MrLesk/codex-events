import { getDatabase } from '#server/database/client'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import { hasEventPhotos } from '#server/domains/events/photos'
import {
  canViewRestrictedEventDetails,
  getCurrentEventTerms,
  getVisibleEventBySlugOrThrow,
  listEventTracks,
  resolveVisibleEventRestrictedFields,
  routeSlugParamsSchema,
  serializeEvent
} from '#server/domains/events'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (h3Event) => {
  const { slug } = parseValidatedParams(h3Event, routeSlugParamsSchema)
  const event = await getVisibleEventBySlugOrThrow(h3Event, slug)
  const database = getDatabase(h3Event)
  const currentTerms = await getCurrentEventTerms(database, event)
  const tracks = await listEventTracks(database, event.id)
  const canViewPhotos = await canViewRestrictedEventDetails(h3Event, event.id)
  const restrictedFields = await resolveVisibleEventRestrictedFields(h3Event, event)

  return apiData({
    ...serializeEvent(event, currentTerms, tracks),
    ...restrictedFields,
    ...(canViewPhotos
      ? {
          hasGallery: await hasEventPhotos(database, event.id)
        }
      : {})
  })
})
