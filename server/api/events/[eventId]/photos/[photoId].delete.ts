import { and, eq } from 'drizzle-orm'

import { writeAuditLog } from '#server/database/audit-log'
import { eventPhotos } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  deleteEventPhotoObject,
  getEventPhotoRecordOrThrow,
  eventPhotoParamsSchema,
  requireEventPhotoManageAccess
} from '#server/domains/events/photos'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (h3Event) => {
  const { eventId, photoId } = parseValidatedParams(h3Event, eventPhotoParamsSchema)
  const { actor, database } = await requireEventPhotoManageAccess(h3Event, eventId)
  const photo = await getEventPhotoRecordOrThrow(database, eventId, photoId)

  await deleteEventPhotoObject(h3Event, eventId, photo.id)

  await database
    .delete(eventPhotos)
    .where(and(
      eq(eventPhotos.eventId, eventId),
      eq(eventPhotos.id, photo.id)
    ))

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'event_photo',
    entityId: photo.id,
    action: 'event_photo.deleted',
    metadata: {
      eventId,
      fileName: photo.fileName
    }
  })

  return apiData({
    id: photo.id
  })
})
