import { defineApiHandler } from '#server/http/api-handler'
import { apiList } from '#server/http/api-response'
import {
  listEventPhotoRecords,
  requireEventPhotoReadAccess
} from '#server/domains/events/photos'
import { routeIdParamsSchema } from '#server/domains/events'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (h3Event) => {
  const { eventId } = parseValidatedParams(h3Event, routeIdParamsSchema)
  const { database } = await requireEventPhotoReadAccess(h3Event, eventId)
  const photos = await listEventPhotoRecords(database, eventId)

  return apiList(photos, {
    total: photos.length
  })
})
