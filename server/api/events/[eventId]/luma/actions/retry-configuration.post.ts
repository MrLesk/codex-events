import { eq } from 'drizzle-orm'

import { requirePlatformActor } from '#server/auth/actor'
import { writeAuditLog } from '#server/database/audit-log'
import { getDatabase } from '#server/database/client'
import { events } from '#server/database/schema'
import {
  getCurrentEventTerms,
  listEventTracks,
  requireEventAdmin,
  routeIdParamsSchema,
  serializeAdminEvent
} from '#server/domains/events'
import { reconcileEventLumaWebhook } from '#server/domains/events/luma-webhook-registration'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (h3Event) => {
  const actor = await requirePlatformActor(h3Event)
  const { eventId } = parseValidatedParams(h3Event, routeIdParamsSchema)
  const { event } = await requireEventAdmin(h3Event, eventId)
  const database = getDatabase(h3Event)

  await reconcileEventLumaWebhook({
    database,
    event,
    runtimeConfig: useRuntimeConfig(h3Event)
  })

  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'event',
    entityId: eventId,
    action: 'event.luma_configuration_retried',
    metadata: {}
  })

  const updatedEvent = await database.query.events.findFirst({
    where: eq(events.id, eventId)
  })
  const currentTerms = await getCurrentEventTerms(database, updatedEvent!)
  const tracks = await listEventTracks(database, eventId)

  return apiData(serializeAdminEvent(updatedEvent!, currentTerms, tracks, {
    appBaseUrl: useRuntimeConfig(h3Event).auth0.appBaseUrl
  }))
})
