import { and, eq } from 'drizzle-orm'

import { writeAuditLog } from '#server/database/audit-log'
import { hackathonPhotos } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  deleteHackathonPhotoObject,
  getHackathonPhotoRecordOrThrow,
  hackathonPhotoParamsSchema,
  requireHackathonPhotoManageAccess
} from '#server/domains/hackathons/photos'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (event) => {
  const { hackathonId, photoId } = parseValidatedParams(event, hackathonPhotoParamsSchema)
  const { actor, database } = await requireHackathonPhotoManageAccess(event, hackathonId)
  const photo = await getHackathonPhotoRecordOrThrow(database, hackathonId, photoId)

  await deleteHackathonPhotoObject(event, hackathonId, photo.id)

  await database
    .delete(hackathonPhotos)
    .where(and(
      eq(hackathonPhotos.hackathonId, hackathonId),
      eq(hackathonPhotos.id, photo.id)
    ))

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'hackathon_photo',
    entityId: photo.id,
    action: 'hackathon_photo.deleted',
    metadata: {
      hackathonId,
      fileName: photo.fileName
    }
  })

  return apiData({
    id: photo.id
  })
})
