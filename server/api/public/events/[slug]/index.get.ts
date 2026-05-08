import { getDatabase } from '#server/database/client'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  getCurrentEventTerms,
  listEventTracks,
  getPublicEventBySlugOrThrow,
  routeSlugParamsSchema,
  serializePublicEvent
} from '#server/domains/events'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (h3Event) => {
  const { slug } = parseValidatedParams(h3Event, routeSlugParamsSchema)
  const database = getDatabase(h3Event)
  const event = await getPublicEventBySlugOrThrow(database, slug)
  const currentTerms = await getCurrentEventTerms(database, event)
  const tracks = await listEventTracks(database, event.id)

  return apiData({
    ...serializePublicEvent(event, currentTerms, tracks)
  })
})
