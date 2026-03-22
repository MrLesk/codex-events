import { requireAuthenticatedActor } from '../../../../auth/actor'
import { getDatabase } from '../../../../database/client'
import { defineApiHandler } from '../../../../utils/api-handler'
import { apiData } from '../../../../utils/api-response'
import { getCurrentHackathonTerms, getVisibleHackathonOrThrow, routeIdParamsSchema, serializeHackathonTermsDocument } from '../../../../utils/hackathon-management'
import { parseValidatedParams } from '../../../../utils/validation'

export default defineApiHandler(async (event) => {
  await requireAuthenticatedActor(event)

  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const hackathon = await getVisibleHackathonOrThrow(event, hackathonId)
  const currentTerms = await getCurrentHackathonTerms(getDatabase(event), hackathon)

  return apiData({
    application_terms: currentTerms.applicationTerms ? serializeHackathonTermsDocument(currentTerms.applicationTerms) : null,
    winner_terms: currentTerms.winnerTerms ? serializeHackathonTermsDocument(currentTerms.winnerTerms) : null
  })
})
