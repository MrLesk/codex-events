import { readMultipartFormData } from 'h3'

import { and, eq, isNull, sql } from 'drizzle-orm'

import { requirePlatformActor } from '#server/auth/actor'
import { getDatabase } from '#server/database/client'
import { events } from '#server/database/schema'
import { writeAuditLog } from '#server/database/audit-log'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  assertValidEventImagePart,
  buildPublicEventImageUrl,
  deleteEventImageObjectBestEffort,
  eventImageObjectKey,
  putEventImageObject
} from '#server/domains/events/images'
import {
  requireEventAdmin,
  routeIdParamsSchema,
  serializeEvent
} from '#server/domains/events'
import { getEventDisplayImageOptions } from '#server/domains/platform/settings'
import { assertAuthenticatedUploadRateLimit } from '#server/utils/rate-limit'
import { parseValidatedParams } from '#server/http/validation'
import { assertGuard } from '#server/domains/lifecycle-guard'

export default defineApiHandler(async (h3Event) => {
  const actor = await requirePlatformActor(h3Event)
  const { eventId } = parseValidatedParams(h3Event, routeIdParamsSchema)
  await assertAuthenticatedUploadRateLimit(h3Event, `authenticated-upload:${actor.platformUser.id}`)
  const { event } = await requireEventAdmin(h3Event, eventId)
  const multipart = await readMultipartFormData(h3Event)
  const filePart = multipart?.find(part => part.name === 'file')
  const validFile = assertValidEventImagePart(filePart ?? {})
  const objectKey = eventImageObjectKey(event.id, 'background')
  const previousObjectKey = event.backgroundImageObjectKey

  await putEventImageObject(h3Event, objectKey, {
    contentType: validFile.contentType,
    data: validFile.data
  })

  const database = getDatabase(h3Event)
  const updatedAt = new Date().toISOString()
  const backgroundImageUrl = buildPublicEventImageUrl(h3Event, event.slug, 'background')

  const [updatedEventRow] = await database
    .update(events)
    .set({
      backgroundImageUrl,
      backgroundImageObjectKey: objectKey,
      backgroundImageRevision: sql`${events.backgroundImageRevision} + 1`,
      publicContentRevision: sql`${events.publicContentRevision} + 1`,
      updatedAt
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
