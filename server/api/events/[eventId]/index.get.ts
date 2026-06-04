import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import { resolveEventAuthorization } from '#server/auth/authorization'
import {
  getVisibleEventOrThrow,
  getCurrentEventTerms,
  listEventTracks,
  resolveVisibleEventRestrictedFields,
  routeIdParamsSchema,
  serializeAdminEvent,
  serializeEvent
} from '#server/domains/events'
import { parseValidatedParams } from '#server/http/validation'
import { getDatabase } from '#server/database/client'
import { getEventDisplayImageOptions } from '#server/domains/platform/settings'

async function isCurrentActorEventAdmin(h3Event: Parameters<typeof resolveEventAuthorization>[0], eventId: string) {
  try {
    return (await resolveEventAuthorization(h3Event, eventId)).isEventAdmin
  } catch {
    return false
  }
}

function serializeTermsReference(document: NonNullable<Awaited<ReturnType<typeof getCurrentEventTerms>>['applicationTerms']>) {
  return {
    id: document.id,
    documentType: document.documentType,
    version: document.version,
    title: document.title,
    publishedAt: document.publishedAt
  }
}

export default defineApiHandler(async (h3Event) => {
  const { eventId } = parseValidatedParams(h3Event, routeIdParamsSchema)
  const event = await getVisibleEventOrThrow(h3Event, eventId)
  const database = getDatabase(h3Event)
  const [
    currentTerms,
    tracks,
    restrictedFields,
    isEventAdmin,
    imageOptions
  ] = await Promise.all([
    getCurrentEventTerms(database, event),
    listEventTracks(database, eventId),
    resolveVisibleEventRestrictedFields(h3Event, event),
    isCurrentActorEventAdmin(h3Event, eventId),
    getEventDisplayImageOptions(database)
  ])
  const serializedEvent = isEventAdmin
    ? serializeAdminEvent(event, undefined, tracks, {
        appBaseUrl: useRuntimeConfig(h3Event).auth0.appBaseUrl,
        ...imageOptions
      })
    : serializeEvent(event, undefined, tracks, imageOptions)

  return apiData({
    ...serializedEvent,
    ...restrictedFields,
    currentTerms: {
      applicationTerms: currentTerms.applicationTerms ? serializeTermsReference(currentTerms.applicationTerms) : null,
      winnerTerms: currentTerms.winnerTerms ? serializeTermsReference(currentTerms.winnerTerms) : null
    }
  })
})
