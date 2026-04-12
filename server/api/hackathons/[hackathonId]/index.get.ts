import { defineApiHandler } from '../../../utils/api-handler'
import { apiData } from '../../../utils/api-response'
import { getVisibleHackathonOrThrow, getCurrentHackathonTerms, listHackathonTracks, routeIdParamsSchema, serializeHackathon } from '../../../utils/hackathon-management'
import { parseValidatedParams } from '../../../utils/validation'
import { getDatabase } from '../../../database/client'

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

  return apiData({
    ...serializeHackathon(hackathon, undefined, tracks),
    currentTerms: {
      applicationTerms: currentTerms.applicationTerms ? serializeTermsReference(currentTerms.applicationTerms) : null,
      winnerTerms: currentTerms.winnerTerms ? serializeTermsReference(currentTerms.winnerTerms) : null
    }
  })
})
