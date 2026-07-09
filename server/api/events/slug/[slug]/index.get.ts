import { getDatabase } from '#server/database/client'
import { resolveEventAuthorization } from '#server/auth/authorization'
import { defineApiHandler } from '#server/http/api-handler'
import { apiData } from '#server/http/api-response'
import { hasEventPhotos } from '#server/domains/events/photos'
import {
  canViewRestrictedEventDetails,
  getCurrentEventTerms,
  getVisibleEventBySlugOrThrow,
  listEventTracks,
  resolveEventTrackStaffInstructionIds,
  resolveVisibleEventRestrictedFields,
  routeSlugParamsSchema,
  serializeEvent
} from '#server/domains/events'
import { parseValidatedParams } from '#server/http/validation'
import { getEventDisplayImageOptions } from '#server/domains/platform/settings'

export default defineApiHandler(async (h3Event) => {
  const { slug } = parseValidatedParams(h3Event, routeSlugParamsSchema)
  const event = await getVisibleEventBySlugOrThrow(h3Event, slug)
  const database = getDatabase(h3Event)
  const [
    currentTerms,
    tracks,
    canViewPhotos,
    restrictedFields,
    imageOptions,
    authorization
  ] = await Promise.all([
    getCurrentEventTerms(database, event),
    listEventTracks(database, event.id),
    canViewRestrictedEventDetails(h3Event, event.id),
    resolveVisibleEventRestrictedFields(h3Event, event),
    getEventDisplayImageOptions(database),
    resolveEventAuthorization(h3Event, event.id).catch(() => null)
  ])

  return apiData({
    ...serializeEvent(event, currentTerms, tracks, {
      ...imageOptions,
      trackStaffInstructionIds: authorization
        ? resolveEventTrackStaffInstructionIds(authorization)
        : undefined
    }),
    ...restrictedFields,
    ...(authorization?.isEventAdmin
      ? { simplifiedClaimingEnabled: event.simplifiedClaimingEnabled }
      : {}),
    ...(canViewPhotos
      ? {
          hasGallery: await hasEventPhotos(database, event.id)
        }
      : {})
  })
})
