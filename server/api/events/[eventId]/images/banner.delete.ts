import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '#server/auth/actor'
import { writeAuditLog } from '#server/database/audit-log'
import { getDatabase } from '#server/database/client'
import { events } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import { deleteEventImageObject } from '#server/domains/events/images'
import {
  requireEventAdmin,
  routeIdParamsSchema,
  serializeEvent
} from '#server/domains/events'
import { getEventDisplayImageOptions } from '#server/domains/platform/settings'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (h3Event) => {
  const actor = await requirePlatformActor(h3Event)
  const { eventId } = parseValidatedParams(h3Event, routeIdParamsSchema)
  const { event } = await requireEventAdmin(h3Event, eventId)
  const database = getDatabase(h3Event)

  await deleteEventImageObject(h3Event, event.id, 'banner')

  await database
    .update(events)
    .set({
      bannerImageUrl: null,
      updatedAt: new Date().toISOString()
    })
    .where(eq(events.id, event.id))

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'event',
    entityId: event.id,
    action: 'event.updated',
    metadata: {
      fields: ['bannerImageUrl']
    }
  })

  const updatedEvent = await database.query.events.findFirst({
    where: eq(events.id, event.id)
  })
  const imageOptions = await getEventDisplayImageOptions(database)

  return apiData(serializeEvent(updatedEvent!, undefined, undefined, imageOptions))
})
