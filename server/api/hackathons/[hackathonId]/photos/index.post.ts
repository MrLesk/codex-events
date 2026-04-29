import { readMultipartFormData } from 'h3'

import { writeAuditLog } from '#server/database/audit-log'
import { hackathonPhotos } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiList } from '#server/http/api-response'
import { ApiError } from '#server/http/api-error'
import {
  assertValidHackathonPhotoPart,
  getHackathonPhotoDimensions,
  listHackathonPhotoRecords,
  putHackathonPhotoObject,
  requireHackathonPhotoManageAccess
} from '#server/utils/hackathon-photos'
import { routeIdParamsSchema } from '#server/utils/hackathon-management'
import { assertAuthenticatedUploadRateLimit } from '#server/utils/rate-limit'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (event) => {
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const { actor, database } = await requireHackathonPhotoManageAccess(event, hackathonId)
  await assertAuthenticatedUploadRateLimit(event, `authenticated-upload:${actor.platformUser.id}`)
  const multipart = await readMultipartFormData(event)
  const fileParts = (multipart ?? []).filter(part => part.name === 'file')

  if (fileParts.length === 0) {
    throw new ApiError({
      statusCode: 400,
      code: 'hackathon_photo_file_required',
      message: 'At least one hackathon photo file is required.'
    })
  }

  const preparedFiles = await Promise.all(fileParts.map(async (part) => {
    const validFile = assertValidHackathonPhotoPart(part)
    const dimensions = await getHackathonPhotoDimensions(event, validFile.data)

    return {
      ...validFile,
      ...dimensions
    }
  }))

  const createdAt = new Date().toISOString()
  const createdRows = preparedFiles.map(file => ({
    id: crypto.randomUUID(),
    hackathonId,
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
    await putHackathonPhotoObject(event, hackathonId, row.id, {
      contentType: file.contentType,
      data: file.data
    })
  }

  await database.insert(hackathonPhotos).values(createdRows)

  for (const row of createdRows) {
    await writeAuditLog(database, {
      actorUserId: actor.platformUser.id,
      entityType: 'hackathon_photo',
      entityId: row.id,
      action: 'hackathon_photo.created',
      metadata: {
        hackathonId,
        fileName: row.fileName
      }
    })
  }

  const photos = await listHackathonPhotoRecords(database, hackathonId)

  return apiList(photos, {
    total: photos.length
  })
})
