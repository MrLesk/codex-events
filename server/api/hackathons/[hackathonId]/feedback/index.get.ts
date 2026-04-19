import { resolveHackathonAuthorization } from '../../../../auth/authorization'
import { getDatabase } from '../../../../database/client'
import { defineApiHandler } from '../../../../utils/api-handler'
import { apiData } from '../../../../utils/api-response'
import {
  assertHackathonFeedbackResultsAccess,
  getHackathonFeedbackSummary
} from '../../../../utils/hackathon-feedback'
import {
  getHackathonOrThrow,
  routeIdParamsSchema
} from '../../../../utils/hackathon-management'
import { parseValidatedParams } from '../../../../utils/validation'

export default defineApiHandler(async (event) => {
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const authorization = await resolveHackathonAuthorization(event, hackathonId)

  assertHackathonFeedbackResultsAccess(authorization)

  const database = getDatabase(event)
  await getHackathonOrThrow(database, hackathonId)

  return apiData(await getHackathonFeedbackSummary(database, hackathonId))
})
