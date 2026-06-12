import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '#server/auth/actor'
import { writeAuditLog } from '#server/database/audit-log'
import { getDatabase } from '#server/database/client'
import { events } from '#server/database/schema'
import {
  requireEventAdmin,
  routeIdParamsSchema,
  serializeAdminEvent
} from '#server/domains/events'
import { assertGuard } from '#server/domains/lifecycle-guard'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (h3Event) => {
  const actor = await requirePlatformActor(h3Event)
  const { eventId } = parseValidatedParams(h3Event, routeIdParamsSchema)
  const database = getDatabase(h3Event)
  const { event } = await requireEventAdmin(h3Event, eventId)

  assertGuard(Boolean(event.hiddenAt), {
    statusCode: 409,
    code: 'event_not_hidden',
    message: 'This event is already visible.',
    details: { eventId }
  })

  const restoredAt = new Date().toISOString()

  await database
    .update(events)
    .set({
      hiddenAt: null,
      hiddenByUserId: null,
      hiddenReason: null,
      updatedAt: restoredAt
    })
    .where(eq(events.id, eventId))

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'event',
    entityId: eventId,
    action: 'event.unhidden',
    metadata: {
      state: event.state,
      hiddenAt: event.hiddenAt,
      hiddenByUserId: event.hiddenByUserId,
      hiddenReason: event.hiddenReason
    }
  })

  const updatedEvent = await database.query.events.findFirst({
    where: eq(events.id, eventId)
  })

  return apiData(serializeAdminEvent(updatedEvent!, undefined, undefined, {
    appBaseUrl: useRuntimeConfig(h3Event).auth0.appBaseUrl
  }))
})
