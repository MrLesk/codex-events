import { getDatabase } from '#server/database/client'
import { defineApiHandler } from '#server/http/api-handler'
import { apiList } from '#server/http/api-response'
import { listPublicHackathonPhotoRecords } from '#server/domains/hackathons/photos'
import {
  getPublicHackathonBySlugOrThrow,
  routeSlugParamsSchema
} from '#server/domains/hackathons'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (event) => {
  const { slug } = parseValidatedParams(event, routeSlugParamsSchema)
  const database = getDatabase(event)
  const hackathon = await getPublicHackathonBySlugOrThrow(database, slug)
  const photos = await listPublicHackathonPhotoRecords(event, database, hackathon.id, hackathon.slug)

  return apiList(photos, {
    total: photos.length
  })
})
