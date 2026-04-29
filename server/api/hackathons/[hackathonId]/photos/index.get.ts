import { defineApiHandler } from '#server/http/api-handler'
import { apiList } from '#server/http/api-response'
import {
  listHackathonPhotoRecords,
  requireHackathonPhotoReadAccess
} from '#server/utils/hackathon-photos'
import { routeIdParamsSchema } from '#server/utils/hackathon-management'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (event) => {
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const { database } = await requireHackathonPhotoReadAccess(event, hackathonId)
  const photos = await listHackathonPhotoRecords(database, hackathonId)

  return apiList(photos, {
    total: photos.length
  })
})
