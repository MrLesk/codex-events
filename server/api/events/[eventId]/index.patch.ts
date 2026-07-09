import { requirePlatformActor } from '#server/auth/actor'
import { writeAuditLog } from '#server/database/audit-log'
import { getDatabase } from '#server/database/client'
import { events } from '#server/database/schema'
import { getSimplifiedClaimingSummary } from '#server/domains/credits/simplified-claiming'
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
  serializeAdminEvent,
  updateEventBodySchema
} from '#server/domains/events'
import { reconcileEventLumaWebhook } from '#server/domains/events/luma-webhook-registration'
import { assertGuard } from '#server/domains/lifecycle-guard'
import { getEventDisplayImageOptions } from '#server/domains/platform/settings'
import { parseValidatedBody, parseValidatedParams } from '#server/http/validation'
import { eq } from 'drizzle-orm'

export default defineApiHandler(async (h3Event) => {
  const actor = await requirePlatformActor(h3Event)
  const { eventId } = parseValidatedParams(h3Event, routeIdParamsSchema)
  const body = await parseValidatedBody(h3Event, updateEventBodySchema)
  const database = getDatabase(h3Event)
  const { event } = await requireEventAdmin(h3Event, eventId)
  const shouldReconcileLuma = Object.hasOwn(body, 'lumaApiKey') || Object.hasOwn(body, 'lumaEventApiId')
  const simplifiedClaiming = await getSimplifiedClaimingSummary(database, event)

  if (simplifiedClaiming.locked) {
    assertGuard(body.simplifiedClaimingEnabled === undefined || body.simplifiedClaimingEnabled === event.simplifiedClaimingEnabled, {
      statusCode: 409,
      code: 'simplified_claiming_locked',
      message: 'Simplified claiming cannot be changed after the first claim.'
    })
    assertGuard(body.slug === undefined || body.slug === event.slug, {
      statusCode: 409,
      code: 'simplified_claiming_slug_locked',
      message: 'The event slug cannot be changed after the first simplified claim.'
    })
  }

  if (body.simplifiedClaimingEnabled === true && !event.simplifiedClaimingEnabled) {
    assertGuard(simplifiedClaiming.offerCount <= 1, {
      statusCode: 409,
      code: 'simplified_claiming_multiple_offers',
      message: 'Simplified claiming supports one credit offer. Delete the extra offers first.'
    })
    assertGuard(simplifiedClaiming.genericClaimCount === 0, {
      statusCode: 409,
      code: 'simplified_claiming_existing_claims',
      message: 'Simplified claiming cannot be enabled after credits were claimed through the standard flow.'
    })
  }

  if (body.slug && body.slug !== event.slug) {
    await assertEventSlugAvailable(database, body.slug, event.id)
  }

  const replacementTracks = event.eventType === 'hackathon' || event.eventType === 'build' ? body.tracks : undefined

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

  if (shouldReconcileLuma) {
    await reconcileEventLumaWebhook({
      database,
      event: updatedEvent!,
      runtimeConfig: useRuntimeConfig(h3Event)
    })
  }

  const configuredEvent = shouldReconcileLuma
    ? await database.query.events.findFirst({
        where: eq(events.id, eventId)
      })
    : updatedEvent
  const [updatedTracks, imageOptions] = await Promise.all([
    listEventTracks(database, eventId),
    getEventDisplayImageOptions(database)
  ])

  return apiData(serializeAdminEvent(configuredEvent!, undefined, updatedTracks, {
    appBaseUrl: useRuntimeConfig(h3Event).auth0.appBaseUrl,
    ...imageOptions
  }))
})
