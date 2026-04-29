import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  getVisibleHackathonOrThrow,
  getCurrentHackathonTerms,
  listHackathonTracks,
  resolveVisibleHackathonRestrictedFields,
  routeIdParamsSchema,
  serializeHackathon
} from '#server/utils/hackathon-management'
import { parseValidatedParams } from '#server/http/validation'
import { getDatabase } from '#server/database/client'

function serializeTermsReference(document: NonNullable<Awaited<ReturnType<typeof getCurrentHackathonTerms>>['applicationTerms']>) {
  return {
    id: document.id,
    documentType: document.documentType,
    version: document.version,
    title: document.title,
    publishedAt: document.publishedAt
  }
}

export default defineApiHandler(async (event) => {
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const hackathon = await getVisibleHackathonOrThrow(event, hackathonId)
  const database = getDatabase(event)
  const currentTerms = await getCurrentHackathonTerms(database, hackathon)
  const tracks = await listHackathonTracks(database, hackathonId)
  const restrictedFields = await resolveVisibleHackathonRestrictedFields(event, hackathon)

  return apiData({
    ...serializeHackathon(hackathon, undefined, tracks),
    ...restrictedFields,
    currentTerms: {
      applicationTerms: currentTerms.applicationTerms ? serializeTermsReference(currentTerms.applicationTerms) : null,
      winnerTerms: currentTerms.winnerTerms ? serializeTermsReference(currentTerms.winnerTerms) : null
    }
  })
})
