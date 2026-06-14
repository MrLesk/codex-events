import { getDatabase } from '#server/database/client'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  getCurrentEventTerms,
  listEventTracks,
  getPublicEventBySlugOrThrow,
  publicEventDetailQuerySchema,
  routeSlugParamsSchema,
  serializePublicEvent
} from '#server/domains/events'
import { getEventDisplayImageOptions } from '#server/domains/platform/settings'
import { parseValidatedParams, parseValidatedQuery } from '#server/http/validation'

export default defineApiHandler(async (h3Event) => {
  const { slug } = parseValidatedParams(h3Event, routeSlugParamsSchema)
  const query = parseValidatedQuery(h3Event, publicEventDetailQuerySchema)
  const database = getDatabase(h3Event)
  const event = await getPublicEventBySlugOrThrow(database, slug)
  const [currentTerms, tracks, imageOptions] = await Promise.all([
    getCurrentEventTerms(database, event),
    listEventTracks(database, event.id),
    getEventDisplayImageOptions(database)
  ])

  return apiData({
    ...serializePublicEvent(event, currentTerms, tracks, {
      ...imageOptions,
      includeFullTrackDetails: query.tracks === 'full'
    })
  })
})
