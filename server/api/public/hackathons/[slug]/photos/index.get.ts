import { getDatabase } from '../../../../../database/client'
import { defineApiHandler } from '../../../../../utils/api-handler'
import { apiList } from '../../../../../utils/api-response'
import { listPublicHackathonPhotoRecords } from '../../../../../utils/hackathon-photos'
import {
  getPublicHackathonBySlugOrThrow,
  routeSlugParamsSchema
} from '../../../../../utils/hackathon-management'
import { parseValidatedParams } from '../../../../../utils/validation'

export default defineApiHandler(async (event) => {
  const { slug } = parseValidatedParams(event, routeSlugParamsSchema)
  const database = getDatabase(event)
  const hackathon = await getPublicHackathonBySlugOrThrow(database, slug)
  const photos = await listPublicHackathonPhotoRecords(database, hackathon.id, hackathon.slug)

  return apiList(photos, {
    total: photos.length
  })
})
