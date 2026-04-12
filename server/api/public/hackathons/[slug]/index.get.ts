import { getDatabase } from '../../../../database/client'
import { defineApiHandler } from '../../../../utils/api-handler'
import { apiData } from '../../../../utils/api-response'
import {
  getCurrentHackathonTerms,
  listHackathonTracks,
  getPublicHackathonBySlugOrThrow,
  routeSlugParamsSchema,
  serializePublicHackathon
} from '../../../../utils/hackathon-management'
import { parseValidatedParams } from '../../../../utils/validation'

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
