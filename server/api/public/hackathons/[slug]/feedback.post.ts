import { getDatabase } from '../../../../database/client'
import { defineApiHandler } from '../../../../utils/api-handler'
import { apiData } from '../../../../utils/api-response'
import {
  assertHackathonFeedbackAvailable,
  createHackathonFeedback,
  createHackathonFeedbackBodySchema
} from '../../../../utils/hackathon-feedback'
import {
  getPublicHackathonBySlugOrThrow,
  routeSlugParamsSchema
} from '../../../../utils/hackathon-management'
import { assertPublicHackathonFeedbackRateLimit } from '../../../../utils/rate-limit'
import { parseValidatedBody, parseValidatedParams } from '../../../../utils/validation'

export default defineApiHandler(async (event) => {
  const { slug } = parseValidatedParams(event, routeSlugParamsSchema)
  const body = await parseValidatedBody(event, createHackathonFeedbackBodySchema)
  const database = getDatabase(event)
  const hackathon = await getPublicHackathonBySlugOrThrow(database, slug)

  assertHackathonFeedbackAvailable(hackathon)
  await assertPublicHackathonFeedbackRateLimit(event, `public-hackathon-feedback:${hackathon.id}`)
  await createHackathonFeedback(database, hackathon.id, body)

  return apiData({
    status: 'submitted'
  })
})
