import { requirePlatformActor } from '#server/auth/actor'
import { writeAuditLog } from '#server/database/audit-log'
import { getDatabase } from '#server/database/client'
import { events } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  assertEventTrackReplacementAllowed,
  assertEventSlugAvailable,
  buildEventUpdatePayload,
  listEventTracks,
  replaceEventTracks,
  requireEventAdmin,
  routeIdParamsSchema,
  serializeEvent,
  updateEventBodySchema
} from '#server/domains/events'
import { parseValidatedBody, parseValidatedParams } from '#server/http/validation'
import { eq } from 'drizzle-orm'

export default defineApiHandler(async (h3Event) => {
  const actor = await requirePlatformActor(h3Event)
  const { eventId } = parseValidatedParams(h3Event, routeIdParamsSchema)
  const body = await parseValidatedBody(h3Event, updateEventBodySchema)
  const database = getDatabase(h3Event)
  const { event } = await requireEventAdmin(h3Event, eventId)

  if (body.slug && body.slug !== event.slug) {
    await assertEventSlugAvailable(database, body.slug, event.id)
  }

  const replacementTracks = event.eventType === 'hackathon' ? body.tracks : undefined

  if (replacementTracks !== undefined) {
    await assertEventTrackReplacementAllowed(database, eventId, replacementTracks)
  }

  const patch = buildEventUpdatePayload(event, body)

  await database
    .update(events)
    .set(patch)
    .where(eq(events.id, eventId))

  if (replacementTracks !== undefined) {
    await replaceEventTracks(database, eventId, replacementTracks)
  }

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'event',
    entityId: eventId,
    action: 'event.updated',
    metadata: {
      fields: Object.keys(body)
    }
  })

  const updatedEvent = await database.query.events.findFirst({
    where: eq(events.id, eventId)
  })
  const updatedTracks = await listEventTracks(database, eventId)

  return apiData(serializeEvent(updatedEvent!, undefined, updatedTracks))
})
