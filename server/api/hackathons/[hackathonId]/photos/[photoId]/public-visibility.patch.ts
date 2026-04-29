import { eq } from 'drizzle-orm'

import { writeAuditLog } from '#server/database/audit-log'
import { hackathonPhotos } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  getHackathonPhotoRecordOrThrow,
  hackathonPhotoParamsSchema,
  listHackathonPhotoRecords,
  requireHackathonPhotoManageAccess,
  updateHackathonPhotoPublicVisibilityBodySchema
} from '#server/utils/hackathon-photos'
import { parseValidatedBody, parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (event) => {
  const { hackathonId, photoId } = parseValidatedParams(event, hackathonPhotoParamsSchema)
  const body = await parseValidatedBody(event, updateHackathonPhotoPublicVisibilityBodySchema)
  const { actor, database } = await requireHackathonPhotoManageAccess(event, hackathonId)
  const photo = await getHackathonPhotoRecordOrThrow(database, hackathonId, photoId)

  await database
    .update(hackathonPhotos)
    .set({
      isPubliclyVisible: body.isPubliclyVisible
    })
    .where(eq(hackathonPhotos.id, photo.id))

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'hackathon_photo',
    entityId: photo.id,
    action: 'hackathon_photo.updated_public_visibility',
    metadata: {
      hackathonId,
      isPubliclyVisible: body.isPubliclyVisible
    }
  })

  const photos = await listHackathonPhotoRecords(database, hackathonId)
  const updatedPhoto = photos.find(entry => entry.id === photo.id)

  return apiData(updatedPhoto!)
})
