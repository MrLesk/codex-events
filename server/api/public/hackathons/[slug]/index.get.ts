import { getDatabase } from '#server/database/client'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  getCurrentHackathonTerms,
  listHackathonTracks,
  getPublicHackathonBySlugOrThrow,
  routeSlugParamsSchema,
  serializePublicHackathon
} from '#server/utils/hackathon-management'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (event) => {
  const { slug } = parseValidatedParams(event, routeSlugParamsSchema)
  const database = getDatabase(event)
  const hackathon = await getPublicHackathonBySlugOrThrow(database, slug)
  const currentTerms = await getCurrentHackathonTerms(database, hackathon)
  const tracks = await listHackathonTracks(database, hackathon.id)

  return apiData({
    ...serializePublicHackathon(hackathon, currentTerms, tracks)
  })
})
