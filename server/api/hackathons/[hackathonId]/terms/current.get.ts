import { requireAuthenticatedActor } from '#server/auth/actor'
import { getDatabase } from '#server/database/client'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import { getCurrentHackathonTerms, getVisibleHackathonOrThrow, routeIdParamsSchema, serializeHackathonTermsDocument } from '#server/domains/hackathons'
import { parseValidatedParams } from '#server/http/validation'

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
