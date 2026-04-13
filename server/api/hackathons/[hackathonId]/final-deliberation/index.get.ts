import { requirePlatformActor } from '../../../../auth/actor'
import { resolveHackathonAuthorization } from '../../../../auth/authorization'
import { getDatabase } from '../../../../database/client'
import { defineApiHandler } from '../../../../utils/api-handler'
import { apiData } from '../../../../utils/api-response'
import { getVisibleHackathonOrThrow, routeIdParamsSchema } from '../../../../utils/hackathon-management'
import { assertGuard } from '../../../../utils/lifecycle-guard'
import {
  assertFinalDeliberationViewAllowed,
  getFinalDeliberationView
} from '../../../../utils/shortlist'
import { parseValidatedParams } from '../../../../utils/validation'

export default defineApiHandler(async (event) => {
  await requirePlatformActor(event)
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const database = getDatabase(event)
  const hackathon = await getVisibleHackathonOrThrow(event, hackathonId)
  const authorization = await resolveHackathonAuthorization(event, hackathonId)
  const canViewFinalDeliberation = authorization.isPlatformAdmin
    || authorization.isHackathonAdmin
    || authorization.canReviewThroughAssignment

  assertGuard(canViewFinalDeliberation, {
    statusCode: 403,
    code: 'final_deliberation_access_denied',
    message: 'This operation requires judge or hackathon admin access.',
    details: { hackathonId }
  })
  assertFinalDeliberationViewAllowed(hackathon)

  return apiData(await getFinalDeliberationView(database, hackathonId))
})
