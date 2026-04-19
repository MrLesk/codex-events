import { defineApiHandler } from '../../../../utils/api-handler'
import { apiList } from '../../../../utils/api-response'
import {
  listHackathonPhotoRecords,
  requireHackathonPhotoReadAccess
} from '../../../../utils/hackathon-photos'
import { routeIdParamsSchema } from '../../../../utils/hackathon-management'
import { parseValidatedParams } from '../../../../utils/validation'

export default defineApiHandler(async (event) => {
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const { database } = await requireHackathonPhotoReadAccess(event, hackathonId)
  const photos = await listHackathonPhotoRecords(database, hackathonId)

  return apiList(photos, {
    total: photos.length
  })
})
