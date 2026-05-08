import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '#server/auth/actor'
import { writeAuditLog } from '#server/database/audit-log'
import { getDatabase } from '#server/database/client'
import { events } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  requireEventAdmin,
  routeIdParamsSchema,
  serializeEvent
} from '#server/domains/events'
import {
  assertStartShortlistAllowed,
  listLeaderboardEntries
} from '#server/domains/outcomes'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (h3Event) => {
  const actor = await requirePlatformActor(h3Event)
  const { eventId } = parseValidatedParams(h3Event, routeIdParamsSchema)
  const database = getDatabase(h3Event)
  const { event } = await requireEventAdmin(h3Event, eventId)
  const leaderboardEntries = await listLeaderboardEntries(database, eventId)

  assertStartShortlistAllowed(event, leaderboardEntries)

  const transitionedAt = new Date().toISOString()

  await database
    .update(events)
    .set({
      state: 'shortlist',
      pitchFinalistSubmissionIdsJson: '[]',
      activePitchPresentationSubmissionId: null,
      pitchPresentationsCompletedAt: null,
      finalRankingSubmissionIdsJson: '[]',
      updatedAt: transitionedAt
    })
    .where(eq(events.id, eventId))

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'event',
    entityId: eventId,
    action: 'event.start_shortlist',
    metadata: {
      previousState: event.state,
      nextState: 'shortlist',
      rankedSubmissionCount: leaderboardEntries.filter(entry => entry.isRanked).length
    }
  })

  const updatedEvent = await database.query.events.findFirst({
    where: eq(events.id, eventId)
  })

  return apiData(serializeEvent(updatedEvent!))
})
