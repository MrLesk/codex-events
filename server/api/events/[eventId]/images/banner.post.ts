import { readMultipartFormData } from 'h3'

import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '#server/auth/actor'
import { writeAuditLog } from '#server/database/audit-log'
import { getDatabase } from '#server/database/client'
import { events } from '#server/database/schema'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import {
  assertValidEventImagePart,
  buildPublicEventImageUrl,
  putEventImageObject
} from '#server/domains/events/images'
import {
  requireEventAdmin,
  routeIdParamsSchema,
  serializeEvent
} from '#server/domains/events'
import { assertAuthenticatedUploadRateLimit } from '#server/utils/rate-limit'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (h3Event) => {
  const actor = await requirePlatformActor(h3Event)
  const { eventId } = parseValidatedParams(h3Event, routeIdParamsSchema)
  await assertAuthenticatedUploadRateLimit(h3Event, `authenticated-upload:${actor.platformUser.id}`)
  const { event } = await requireEventAdmin(h3Event, eventId)
  const multipart = await readMultipartFormData(h3Event)
  const filePart = multipart?.find(part => part.name === 'file')
  const validFile = assertValidEventImagePart(filePart ?? {})

  await putEventImageObject(h3Event, event.id, 'banner', {
    contentType: validFile.contentType,
    data: validFile.data
  })

  const database = getDatabase(h3Event)
  const updatedAt = new Date().toISOString()
  const bannerImageUrl = buildPublicEventImageUrl(h3Event, event.slug, 'banner')

  await database
    .update(events)
    .set({
      bannerImageUrl,
      updatedAt
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

  return apiData(serializeEvent(updatedEvent!))
})
