import { getDatabase } from '../../../../database/client'
import { defineApiHandler } from '../../../../utils/api-handler'
import { apiData } from '../../../../utils/api-response'
import {
  getCurrentHackathonTerms,
  getVisibleHackathonBySlugOrThrow,
  routeSlugParamsSchema,
  serializeHackathon
} from '../../../../utils/hackathon-management'
import { parseValidatedParams } from '../../../../utils/validation'

export default defineApiHandler(async (event) => {
  const { slug } = parseValidatedParams(event, routeSlugParamsSchema)
  const hackathon = await getVisibleHackathonBySlugOrThrow(event, slug)
  const currentTerms = await getCurrentHackathonTerms(getDatabase(event), hackathon)

  return apiData({
    ...serializeHackathon(hackathon, currentTerms)
  })
})
