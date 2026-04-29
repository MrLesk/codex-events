import { getDatabase } from '#server/database/client'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  assertHackathonFeedbackAvailable,
  createHackathonFeedback,
  createHackathonFeedbackBodySchema
} from '#server/utils/hackathon-feedback'
import {
  getPublicHackathonBySlugOrThrow,
  routeSlugParamsSchema
} from '#server/utils/hackathon-management'
import { assertPublicHackathonFeedbackRateLimit } from '#server/utils/rate-limit'
import { parseValidatedBody, parseValidatedParams } from '#server/http/validation'

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
