import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '#server/auth/actor'
import { writeAuditLog } from '#server/database/audit-log'
import { getDatabase } from '#server/database/client'
import { events, judgeAssignments } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  assertStartPitchReviewAllowed,
  buildPitchReviewAssignments,
  chunkRowsForD1,
  listAutomaticJudgePoolForEvent,
  listLockedSubmissionsForEvent,
  selectPitchReviewSubmissions
} from '#server/domains/judging'
import {
  assertEventNotHidden,
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
  assertEventNotHidden(event)
  const [lockedSubmissions, judgePanel] = await Promise.all([
    listLockedSubmissionsForEvent(database, eventId),
    listAutomaticJudgePoolForEvent(database, eventId)
  ])
  const finalistSubmissions = selectPitchReviewSubmissions(event, lockedSubmissions)

  assertStartPitchReviewAllowed(event, {
    lockedSubmissionCount: lockedSubmissions.length,
    finalistSubmissionCount: finalistSubmissions.length,
    judgePanelCount: judgePanel.length
  })

  const transitionedAt = new Date().toISOString()
  const assignmentRows = buildPitchReviewAssignments(
    eventId,
    finalistSubmissions,
    judgePanel,
    transitionedAt
  )
  const assignmentRowChunks = chunkRowsForD1(assignmentRows, 12)

  await database.batch([
    database
      .update(events)
      .set({
        state: 'pitch_review',
        updatedAt: transitionedAt
      })
      .where(eq(events.id, eventId)),
    ...assignmentRowChunks.map(rows =>
      database.insert(judgeAssignments).values(rows)
    )
  ])

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'event',
    entityId: eventId,
    action: 'event.start_pitch_review',
    metadata: {
      previousState: event.state,
      nextState: 'pitch_review',
      finalistSubmissionCount: finalistSubmissions.length,
      judgePanelCount: judgePanel.length,
      createdAssignmentCount: assignmentRows.length
    }
  })

  const updatedEvent = await database.query.events.findFirst({
    where: eq(events.id, eventId)
  })

  return apiData(serializeEvent(updatedEvent!))
})
