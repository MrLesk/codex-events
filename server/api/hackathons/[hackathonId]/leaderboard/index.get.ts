import { requirePlatformActor } from '#server/auth/actor'
import { resolveHackathonAuthorization } from '#server/auth/authorization'
import { getDatabase } from '#server/database/client'
import { defineApiHandler } from '#server/http/api-handler'
import { apiList } from '#server/http/api-response'
import { getVisibleHackathonOrThrow, routeIdParamsSchema } from '#server/domains/hackathons'
import { assertGuard } from '#server/domains/lifecycle-guard'
import { listLeaderboardEntries, serializeLeaderboardEntry } from '#server/domains/outcomes'
import { parseValidatedParams } from '#server/http/validation'

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
