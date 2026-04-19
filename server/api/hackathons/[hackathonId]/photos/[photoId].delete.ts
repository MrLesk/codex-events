import { and, eq } from 'drizzle-orm'

import { writeAuditLog } from '../../../../database/audit-log'
import { hackathonPhotos } from '../../../../database/schema'
import { defineApiHandler } from '../../../../utils/api-handler'
import { apiData } from '../../../../utils/api-response'
import {
  deleteHackathonPhotoObject,
  getHackathonPhotoRecordOrThrow,
  hackathonPhotoParamsSchema,
  requireHackathonPhotoManageAccess
} from '../../../../utils/hackathon-photos'
import { parseValidatedParams } from '../../../../utils/validation'

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
