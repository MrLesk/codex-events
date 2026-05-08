import { eq } from 'drizzle-orm'

import { writeAuditLog } from '#server/database/audit-log'
import { eventPhotos } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  getEventPhotoRecordOrThrow,
  eventPhotoParamsSchema,
  listEventPhotoRecords,
  requireEventPhotoManageAccess,
  updateEventPhotoPublicVisibilityBodySchema
} from '#server/domains/events/photos'
import { parseValidatedBody, parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (h3Event) => {
  const { eventId, photoId } = parseValidatedParams(h3Event, eventPhotoParamsSchema)
  const body = await parseValidatedBody(h3Event, updateEventPhotoPublicVisibilityBodySchema)
  const { actor, database } = await requireEventPhotoManageAccess(h3Event, eventId)
  const photo = await getEventPhotoRecordOrThrow(database, eventId, photoId)

  await database
    .update(eventPhotos)
    .set({
      isPubliclyVisible: body.isPubliclyVisible
    })
    .where(eq(eventPhotos.id, photo.id))

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'event_photo',
    entityId: photo.id,
    action: 'event_photo.updated_public_visibility',
    metadata: {
      eventId,
      isPubliclyVisible: body.isPubliclyVisible
    }
  })

  const photos = await listEventPhotoRecords(database, eventId)
  const updatedPhoto = photos.find(entry => entry.id === photo.id)

  return apiData(updatedPhoto!)
})
