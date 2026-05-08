import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '#server/auth/actor'
import { writeAuditLog } from '#server/database/audit-log'
import { getDatabase } from '#server/database/client'
import { events } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  requireEventAdmin,
  routeIdParamsSchema
} from '#server/domains/events'
import {
  assertSelectFinalistsAllowed,
  assertSelectedFinalistsRespectOrder,
  assertSelectedFinalistsMatchEntries,
  assertSelectedShortlistOrderMatchesEntries,
  listLeaderboardEntries,
  listShortlistEntries,
  selectFinalistsBodySchema
} from '#server/domains/outcomes'
import { parseValidatedBody, parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (h3Event) => {
  const actor = await requirePlatformActor(h3Event)
  const { eventId } = parseValidatedParams(h3Event, routeIdParamsSchema)
  const body = await parseValidatedBody(h3Event, selectFinalistsBodySchema)
  const database = getDatabase(h3Event)
  const { event } = await requireEventAdmin(h3Event, eventId)

  assertSelectFinalistsAllowed(event)

  const rankedEntries = (await listLeaderboardEntries(database, eventId))
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
    .update(events)
    .set({
      pitchFinalistSubmissionIdsJson: JSON.stringify(body.finalistSubmissionIds),
      finalRankingSubmissionIdsJson: JSON.stringify(body.orderedSubmissionIds),
      updatedAt: selectedAt
    })
    .where(eq(events.id, eventId))

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'event',
    entityId: eventId,
    action: 'event.pitch_finalists_selected',
    metadata: {
      orderedSubmissionIds: body.orderedSubmissionIds,
      finalistSubmissionIds: body.finalistSubmissionIds,
      finalistSubmissionCount: body.finalistSubmissionIds.length
    }
  })

  return apiData(await listShortlistEntries(database, eventId))
})
