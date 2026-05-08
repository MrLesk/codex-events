import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '#server/auth/actor'
import { writeAuditLog } from '#server/database/audit-log'
import { getDatabase } from '#server/database/client'
import { events } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  assertStartJudgingPreparationAllowed,
  listSubmittedSubmissionsForEvent
} from '#server/domains/judging'
import {
  requireEventAdmin,
  routeIdParamsSchema,
  serializeEvent
} from '#server/domains/events'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (h3Event) => {
  const actor = await requirePlatformActor(h3Event)
  const { eventId } = parseValidatedParams(h3Event, routeIdParamsSchema)
  const database = getDatabase(h3Event)
  const { event } = await requireEventAdmin(h3Event, eventId)
  const submittedSubmissions = await listSubmittedSubmissionsForEvent(database, eventId)

  assertStartJudgingPreparationAllowed(event, {
    submittedSubmissionCount: submittedSubmissions.length
  })

  const transitionedAt = new Date().toISOString()

  await database
    .update(events)
    .set({
      state: 'judging_preparation',
      updatedAt: transitionedAt
    })
    .where(eq(events.id, eventId))

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'event',
    entityId: eventId,
    action: 'event.start_judging_preparation',
    metadata: {
      previousState: event.state,
      nextState: 'judging_preparation',
      submittedSubmissionCount: submittedSubmissions.length
    }
  })

  const updatedEvent = await database.query.events.findFirst({
    where: eq(events.id, eventId)
  })

  return apiData(serializeEvent(updatedEvent!))
})
