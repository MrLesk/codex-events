import { requirePlatformActor } from '../../../../auth/actor'
import { resolveHackathonAuthorization } from '../../../../auth/authorization'
import { getDatabase } from '../../../../database/client'
import { defineApiHandler } from '../../../../utils/api-handler'
import { apiList } from '../../../../utils/api-response'
import { getVisibleHackathonOrThrow, routeIdParamsSchema } from '../../../../utils/hackathon-management'
import { assertGuard } from '../../../../utils/lifecycle-guard'
import { listLeaderboardEntries, serializeLeaderboardEntry } from '../../../../utils/shortlist'
import { parseValidatedParams } from '../../../../utils/validation'

export default defineApiHandler(async (event) => {
  await requirePlatformActor(event)
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const database = getDatabase(event)

  await getVisibleHackathonOrThrow(event, hackathonId)
  const authorization = await resolveHackathonAuthorization(event, hackathonId)
  const canViewLeaderboard = authorization.isPlatformAdmin
    || authorization.isHackathonAdmin
    || authorization.canReviewThroughAssignment

  assertGuard(canViewLeaderboard, {
    statusCode: 403,
    code: 'leaderboard_access_denied',
    message: 'This operation requires judge or hackathon admin access.',
    details: { hackathonId }
  })

  const leaderboardEntries = await listLeaderboardEntries(database, hackathonId)

  return apiList(
    leaderboardEntries.map(serializeLeaderboardEntry),
    {
      total: leaderboardEntries.length
    }
  )
})
