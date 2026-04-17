import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '../../../../../auth/actor'
import { writeAuditLog } from '../../../../../database/audit-log'
import { getDatabase } from '../../../../../database/client'
import { hackathons } from '../../../../../database/schema'
import { defineApiHandler } from '../../../../../utils/api-handler'
import { apiData } from '../../../../../utils/api-response'
import {
  requireHackathonAdmin,
  routeIdParamsSchema
} from '../../../../../utils/hackathon-management'
import {
  assertSelectFinalistsAllowed,
  assertSelectedFinalistsRespectOrder,
  assertSelectedFinalistsMatchEntries,
  assertSelectedShortlistOrderMatchesEntries,
  listLeaderboardEntries,
  listShortlistEntries,
  selectFinalistsBodySchema
} from '../../../../../utils/shortlist'
import { parseValidatedBody, parseValidatedParams } from '../../../../../utils/validation'

export default defineApiHandler(async (event) => {
  const actor = await requirePlatformActor(event)
  const { hackathonId } = parseValidatedParams(event, routeIdParamsSchema)
  const body = await parseValidatedBody(event, selectFinalistsBodySchema)
  const database = getDatabase(event)
  const { hackathon } = await requireHackathonAdmin(event, hackathonId)

  assertSelectFinalistsAllowed(hackathon)

  const rankedEntries = (await listLeaderboardEntries(database, hackathonId))
    .filter(entry => entry.isRanked)

  assertSelectedShortlistOrderMatchesEntries(
    body.orderedSubmissionIds,
    rankedEntries.map(entry => ({ submissionId: entry.submission.id }))
  )

  assertSelectedFinalistsMatchEntries(
    body.finalistSubmissionIds,
    rankedEntries.map(entry => ({ submissionId: entry.submission.id }))
  )
  assertSelectedFinalistsRespectOrder(body.finalistSubmissionIds, body.orderedSubmissionIds)

  const selectedAt = new Date().toISOString()

  await database
    .update(hackathons)
    .set({
      pitchFinalistSubmissionIdsJson: JSON.stringify(body.finalistSubmissionIds),
      finalRankingSubmissionIdsJson: JSON.stringify(body.orderedSubmissionIds),
      updatedAt: selectedAt
    })
    .where(eq(hackathons.id, hackathonId))

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'hackathon',
    entityId: hackathonId,
    action: 'hackathon.pitch_finalists_selected',
    metadata: {
      orderedSubmissionIds: body.orderedSubmissionIds,
      finalistSubmissionIds: body.finalistSubmissionIds,
      finalistSubmissionCount: body.finalistSubmissionIds.length
    }
  })

  return apiData(await listShortlistEntries(database, hackathonId))
})
