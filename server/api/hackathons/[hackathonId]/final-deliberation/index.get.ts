import { requirePlatformActor } from '#server/auth/actor'
import { resolveHackathonAuthorization } from '#server/auth/authorization'
import { getDatabase } from '#server/database/client'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import { getVisibleHackathonOrThrow, routeIdParamsSchema } from '#server/domains/hackathons'
import { assertGuard } from '#server/domains/hackathons/lifecycle-guard'
import {
  assertFinalDeliberationViewAllowed,
  getFinalDeliberationView
} from '#server/utils/shortlist'
import { parseValidatedParams } from '#server/http/validation'

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
