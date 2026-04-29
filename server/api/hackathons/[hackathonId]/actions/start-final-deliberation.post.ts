import { and, eq } from 'drizzle-orm'

import { requirePlatformActor } from '#server/auth/actor'
import { writeAuditLog } from '#server/database/audit-log'
import { getDatabase } from '#server/database/client'
import { hackathons, judgeAssignments } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  requireHackathonAdmin,
  routeIdParamsSchema,
  serializeHackathon
} from '#server/domains/hackathons'
import {
  assertStartFinalDeliberationAllowed,
  listLeaderboardEntries
} from '#server/utils/shortlist'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const database = getDatabase(event)
  const { hackathon } = await requireHackathonAdmin(event, hackathonId)
  const leaderboardEntries = await listLeaderboardEntries(database, hackathonId)
  const completedPitchReviewCount = hackathon.state !== 'pitch_review'
    ? 0
    : (await database.query.judgeAssignments.findMany({
        columns: {
          id: true
        },
        where: and(
          eq(judgeAssignments.hackathonId, hackathonId),
          eq(judgeAssignments.reviewStage, 'pitch_review'),
          eq(judgeAssignments.status, 'judge_completed')
        )
      })).length

  assertStartFinalDeliberationAllowed(hackathon, leaderboardEntries, {
    completedPitchReviewCount
  })

  const transitionedAt = new Date().toISOString()

  await database
    .update(hackathons)
    .set({
      state: 'final_deliberation',
      finalRankingSubmissionIdsJson: '[]',
      updatedAt: transitionedAt
    })
    .where(eq(hackathons.id, hackathonId))

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'hackathon',
    entityId: hackathonId,
    action: 'hackathon.start_final_deliberation',
    metadata: {
      previousState: hackathon.state,
      nextState: 'final_deliberation',
      rankedSubmissionCount: leaderboardEntries.filter(entry => entry.isRanked).length
    }
  })

  const updatedHackathon = await database.query.hackathons.findFirst({
    where: eq(hackathons.id, hackathonId)
  })

  return apiData(serializeHackathon(updatedHackathon!))
})
