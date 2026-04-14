import { getDatabase } from '../../../../database/client'
import { defineApiHandler } from '../../../../utils/api-handler'
import { apiData } from '../../../../utils/api-response'
import {
  getCurrentHackathonTerms,
  getVisibleHackathonBySlugOrThrow,
  listHackathonTracks,
  resolveVisibleHackathonRestrictedFields,
  routeSlugParamsSchema,
  serializeHackathon
} from '../../../../utils/hackathon-management'
import { parseValidatedParams } from '../../../../utils/validation'

export default defineApiHandler(async (event) => {
  const { slug } = parseValidatedParams(event, routeSlugParamsSchema)
  const hackathon = await getVisibleHackathonBySlugOrThrow(event, slug)
  const database = getDatabase(event)
  const currentTerms = await getCurrentHackathonTerms(database, hackathon)
  const tracks = await listHackathonTracks(database, hackathon.id)
  const restrictedFields = await resolveVisibleHackathonRestrictedFields(event, hackathon)

  return apiData({
    ...serializeHackathon(hackathon, currentTerms, tracks),
    ...restrictedFields
  })
})
