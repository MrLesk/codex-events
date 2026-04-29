import { getDatabase } from '#server/database/client'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import { hasHackathonPhotos } from '#server/domains/hackathons/photos'
import {
  canViewRestrictedHackathonDetails,
  getCurrentHackathonTerms,
  getVisibleHackathonBySlugOrThrow,
  listHackathonTracks,
  resolveVisibleHackathonRestrictedFields,
  routeSlugParamsSchema,
  serializeHackathon
} from '#server/domains/hackathons'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (event) => {
  const { slug } = parseValidatedParams(event, routeSlugParamsSchema)
  const hackathon = await getVisibleHackathonBySlugOrThrow(event, slug)
  const database = getDatabase(event)
  const currentTerms = await getCurrentHackathonTerms(database, hackathon)
  const tracks = await listHackathonTracks(database, hackathon.id)
  const canViewPhotos = await canViewRestrictedHackathonDetails(event, hackathon.id)
  const restrictedFields = await resolveVisibleHackathonRestrictedFields(event, hackathon)

  return apiData({
    ...serializeHackathon(hackathon, currentTerms, tracks),
    ...restrictedFields,
    ...(canViewPhotos
      ? {
          hasGallery: await hasHackathonPhotos(database, hackathon.id)
        }
      : {})
  })
})
