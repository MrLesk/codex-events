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
  const currentTerms = await getCurrentEventTerms(database, event)
  const tracks = await listEventTracks(database, eventId)
  const restrictedFields = await resolveVisibleEventRestrictedFields(h3Event, event)
  const serializedEvent = await isCurrentActorEventAdmin(h3Event, eventId)
    ? serializeAdminEvent(event, undefined, tracks, {
        appBaseUrl: useRuntimeConfig(h3Event).auth0.appBaseUrl
      })
    : serializeEvent(event, undefined, tracks)

  return apiData({
    ...serializedEvent,
    ...restrictedFields,
    currentTerms: {
      applicationTerms: currentTerms.applicationTerms ? serializeTermsReference(currentTerms.applicationTerms) : null,
      winnerTerms: currentTerms.winnerTerms ? serializeTermsReference(currentTerms.winnerTerms) : null
    }
  })
})
