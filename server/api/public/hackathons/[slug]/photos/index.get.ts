import { getDatabase } from '#server/database/client'
import { defineApiHandler } from '#server/utils/api-handler'
import { apiList } from '#server/utils/api-response'
import { listPublicHackathonPhotoRecords } from '#server/utils/hackathon-photos'
import {
  getPublicHackathonBySlugOrThrow,
  routeSlugParamsSchema
} from '#server/utils/hackathon-management'
import { parseValidatedParams } from '#server/utils/validation'

export default defineApiHandler(async (event) => {
  const { slug } = parseValidatedParams(event, routeSlugParamsSchema)
  const database = getDatabase(event)
  const hackathon = await getPublicHackathonBySlugOrThrow(database, slug)
  const photos = await listPublicHackathonPhotoRecords(event, database, hackathon.id, hackathon.slug)

  return apiList(photos, {
    total: photos.length
  })
})
