import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '#server/auth/actor'
import { writeAuditLog } from '#server/database/audit-log'
import { getDatabase } from '#server/database/client'
import { hackathons } from '#server/database/schema'
import { defineApiHandler } from '#server/utils/api-handler'
import { apiData } from '#server/utils/api-response'
import {
  requireHackathonAdmin,
  routeIdParamsSchema
} from '#server/utils/hackathon-management'
import {
  assertFinalDeliberationReorderAllowed,
  assertFinalDeliberationReorderMatchesEntries,
  getFinalDeliberationView,
  listLeaderboardEntries,
  reorderFinalDeliberationBodySchema
} from '#server/utils/shortlist'
import { parseValidatedBody, parseValidatedParams } from '#server/utils/validation'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const body = await parseValidatedBody(event, reorderFinalDeliberationBodySchema)
  const database = getDatabase(event)
  const { hackathon } = await requireHackathonAdmin(event, hackathonId)

  assertFinalDeliberationReorderAllowed(hackathon)

  const rankedEntries = (await listLeaderboardEntries(database, hackathonId))
    .filter(entry => entry.isRanked)

  assertFinalDeliberationReorderMatchesEntries(
    body.orderedSubmissionIds,
    rankedEntries.map(entry => ({ submissionId: entry.submission.id }))
  )

  const reorderedAt = new Date().toISOString()

  await database
    .update(hackathons)
    .set({
      finalRankingSubmissionIdsJson: JSON.stringify(body.orderedSubmissionIds),
      updatedAt: reorderedAt
    })
    .where(eq(hackathons.id, hackathonId))

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'hackathon',
    entityId: hackathonId,
    action: 'hackathon.final_ranking_reordered',
    metadata: {
      orderedSubmissionIds: body.orderedSubmissionIds,
      rankedSubmissionCount: rankedEntries.length
    }
  })

  return apiData(await getFinalDeliberationView(database, hackathonId))
})
