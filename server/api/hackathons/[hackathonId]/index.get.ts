import { defineApiHandler } from '../../../utils/api-handler'
import { apiData } from '../../../utils/api-response'
import { getVisibleHackathonOrThrow, getCurrentHackathonTerms, routeIdParamsSchema, serializeHackathon } from '../../../utils/hackathon-management'
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
  const currentTerms = await getCurrentHackathonTerms(getDatabase(event), hackathon)

  return apiData({
    ...serializeHackathon(hackathon),
    currentTerms: {
      applicationTerms: currentTerms.applicationTerms ? serializeTermsReference(currentTerms.applicationTerms) : null,
      winnerTerms: currentTerms.winnerTerms ? serializeTermsReference(currentTerms.winnerTerms) : null
    }
  })
})
