import { resolveHackathonAuthorization } from '#server/auth/authorization'
import { getDatabase } from '#server/database/client'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  assertHackathonFeedbackResultsAccess,
  getHackathonFeedbackSummary
} from '#server/utils/hackathon-feedback'
import {
  getHackathonOrThrow,
  routeIdParamsSchema
} from '#server/utils/hackathon-management'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (event) => {
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const authorization = await resolveHackathonAuthorization(event, hackathonId)

  assertHackathonFeedbackResultsAccess(authorization)

  const database = getDatabase(event)
  await getHackathonOrThrow(database, hackathonId)

  return apiData(await getHackathonFeedbackSummary(database, hackathonId))
})
