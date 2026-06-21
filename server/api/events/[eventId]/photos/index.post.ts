import { readMultipartFormData } from 'h3'

import { writeAuditLog } from '#server/database/audit-log'
import { eventPhotos } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiList } from '#server/http/api-response'
import { ApiError } from '#server/http/api-error'
import {
  assertValidEventPhotoPart,
  chunkEventPhotoRowsForInsert,
  getEventPhotoDimensions,
  listEventPhotoRecords,
  putEventPhotoObject,
  requireEventPhotoManageAccess
} from '#server/domains/events/photos'
import { routeIdParamsSchema } from '#server/domains/events'
import { assertAuthenticatedUploadRateLimit } from '#server/utils/rate-limit'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (h3Event) => {
  const { eventId } = parseValidatedParams(h3Event, routeIdParamsSchema)
  const { actor, database } = await requireEventPhotoManageAccess(h3Event, eventId)
  await assertAuthenticatedUploadRateLimit(h3Event, `authenticated-upload:${actor.platformUser.id}`)
  const multipart = await readMultipartFormData(h3Event)
  const fileParts = (multipart ?? []).filter(part => part.name === 'file')

  if (fileParts.length === 0) {
    throw new ApiError({
      statusCode: 400,
      code: 'event_photo_file_required',
      message: 'At least one event photo file is required.'
    })
  }

  const preparedFiles = []

  for (const part of fileParts) {
    const validFile = assertValidEventPhotoPart(part)
    const dimensions = await getEventPhotoDimensions(h3Event, validFile.data)

    preparedFiles.push({
      ...validFile,
      ...dimensions
    })
  }

  const createdAt = new Date().toISOString()
  const createdRows = preparedFiles.map(file => ({
    id: crypto.randomUUID(),
    eventId,
    uploadedByUserId: actor.platformUser.id,
    fileName: file.fileName,
    isPubliclyVisible: false,
    contentType: file.contentType,
    width: file.width,
    height: file.height,
    createdAt
  }))

  for (const [index, row] of createdRows.entries()) {
    const file = preparedFiles[index]!
    await putEventPhotoObject(h3Event, eventId, row.id, {
      contentType: file.contentType,
      data: file.data
    })
  }

  // D1 allows at most 100 bound parameters per statement. Each event photo row
  // binds nine values, so keep metadata inserts at 11 rows per query.
  for (const rowBatch of chunkEventPhotoRowsForInsert(createdRows)) {
    await database.insert(eventPhotos).values(rowBatch)
  }

  for (const row of createdRows) {
    await writeAuditLog(database, {
      actorUserId: actor.platformUser.id,
      entityType: 'event_photo',
      entityId: row.id,
      action: 'event_photo.created',
      metadata: {
        eventId,
        fileName: row.fileName
      }
    })
  }

  const photos = await listEventPhotoRecords(database, eventId)

  return apiList(photos, {
    total: photos.length
  })
})
