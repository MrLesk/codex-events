import { and, eq, isNull, sql } from 'drizzle-orm'

import { requirePlatformActor } from '#server/auth/actor'
import { writeAuditLog } from '#server/database/audit-log'
import { getDatabase } from '#server/database/client'
import { events } from '#server/database/schema'
import { deleteEventImageObjectBestEffort } from '#server/domains/events/images'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  requireEventAdmin,
  routeIdParamsSchema,
  serializeEvent
} from '#server/domains/events'
import { getEventDisplayImageOptions } from '#server/domains/platform/settings'
import { parseValidatedParams } from '#server/http/validation'
import { assertGuard } from '#server/domains/lifecycle-guard'

export default defineApiHandler(async (h3Event) => {
  const actor = await requirePlatformActor(h3Event)
  const { eventId } = parseValidatedParams(h3Event, routeIdParamsSchema)
  const { event } = await requireEventAdmin(h3Event, eventId)
  const database = getDatabase(h3Event)
  const previousObjectKey = event.backgroundImageObjectKey

  const [updatedEventRow] = await database
    .update(events)
    .set({
      backgroundImageUrl: null,
      backgroundImageObjectKey: null,
      backgroundImageRevision: sql`${events.backgroundImageRevision} + 1`,
      publicContentRevision: sql`${events.publicContentRevision} + 1`,
      updatedAt: new Date().toISOString()
    })
    .where(and(
      eq(events.id, event.id),
      eq(events.backgroundImageRevision, event.backgroundImageRevision),
      previousObjectKey
        ? eq(events.backgroundImageObjectKey, previousObjectKey)
        : isNull(events.backgroundImageObjectKey)
    ))
    .returning({ id: events.id })

  assertGuard(Boolean(updatedEventRow), {
    statusCode: 409,
    code: 'event_background_image_changed',
    message: 'The event background image changed while this request was in progress.',
    details: {
      eventId: event.id
    }
  })

  if (previousObjectKey) {
    await deleteEventImageObjectBestEffort(h3Event, previousObjectKey)
  }

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'event',
    entityId: event.id,
    action: 'event.updated',
    metadata: {
      fields: ['backgroundImageUrl']
    }
  })

  const updatedEvent = await database.query.events.findFirst({
    where: eq(events.id, event.id)
  })
  const imageOptions = await getEventDisplayImageOptions(database)

  return apiData(serializeEvent(updatedEvent!, undefined, undefined, imageOptions))
})
