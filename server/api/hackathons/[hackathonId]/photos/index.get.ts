import { defineApiHandler } from '#server/utils/api-handler'
import { apiList } from '#server/utils/api-response'
import {
  listHackathonPhotoRecords,
  requireHackathonPhotoReadAccess
} from '#server/utils/hackathon-photos'
import { routeIdParamsSchema } from '#server/utils/hackathon-management'
import { parseValidatedParams } from '#server/utils/validation'

export default defineApiHandler(async (event) => {
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const { database } = await requireHackathonPhotoReadAccess(event, hackathonId)
  const photos = await listHackathonPhotoRecords(database, hackathonId)

  return apiList(photos, {
    total: photos.length
  })
})
