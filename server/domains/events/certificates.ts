import { and, eq, inArray, isNull } from 'drizzle-orm'
import { z } from 'zod'

import type { AppDatabase } from '#server/database/client'
import {
  eventTracks,
  submissions,
  teamMembers,
  teams,
  userApplications,
  users
} from '#server/database/schema'
import {
  getPublicEventBySlugOrThrow,
  parseEventAgendaItems
} from '#server/domains/events'
import {
  getEventDisplayImageOptions,
  resolveEventDisplayBackgroundImageUrl
} from '#server/domains/platform/settings'
import { ApiError } from '#server/http/api-error'
import type { EventCertificate } from '#shared/domains/events/certificates'
import {
  buildEventCertificateId,
  formatEventCertificateDate,
  resolveEventCertificateDateIso
} from '#shared/domains/events/certificates'

export const certificateRouteParamsSchema = z.object({
  slug: z.string().trim().min(1),
  userId: z.string().trim().min(1)
})

function buildCertificateNotFoundError(slug: string, userId: string) {
  return new ApiError({
    statusCode: 404,
    code: 'certificate_not_found',
    message: 'No participation certificate exists for this event participant.',
    details: { slug, userId }
  })
}

async function resolveSubmittedTrackName(database: AppDatabase, eventId: string, userId: string) {
  const rows = await database
    .select({ trackName: eventTracks.name })
    .from(teamMembers)
    .innerJoin(teams, eq(teams.id, teamMembers.teamId))
    .innerJoin(submissions, eq(submissions.teamId, teams.id))
    .innerJoin(eventTracks, eq(eventTracks.id, submissions.trackId))
    .where(and(
      eq(teamMembers.userId, userId),
      isNull(teamMembers.leftAt),
      eq(teams.eventId, eventId),
      inArray(submissions.status, ['submitted', 'locked'])
    ))
    .limit(1)

  return rows[0]?.trackName ?? null
}

export async function getEventCertificateOrThrow(
  database: AppDatabase,
  slug: string,
  userId: string
): Promise<EventCertificate> {
  const event = await getPublicEventBySlugOrThrow(database, slug)

  const application = await database.query.userApplications.findFirst({
    where: and(
      eq(userApplications.eventId, event.id),
      eq(userApplications.userId, userId),
      eq(userApplications.status, 'approved')
    )
  })

  if (!application?.checkedInAt) {
    throw buildCertificateNotFoundError(slug, userId)
  }

  const participant = await database.query.users.findFirst({
    where: and(
      eq(users.id, userId),
      isNull(users.deletedAt)
    )
  })

  if (!participant) {
    throw buildCertificateNotFoundError(slug, userId)
  }

  const [trackName, imageOptions] = await Promise.all([
    event.eventType === 'hackathon'
      ? resolveSubmittedTrackName(database, event.id, userId)
      : Promise.resolve(null),
    getEventDisplayImageOptions(database)
  ])

  const eventDateIso = resolveEventCertificateDateIso(
    parseEventAgendaItems(event.agendaItemsJson),
    event.submissionOpensAt
  )
  const participantName = `${participant.firstName} ${participant.familyName}`.trim() || participant.displayName

  return {
    participantName,
    eventName: event.name,
    eventSlug: event.slug,
    eventType: event.eventType,
    eventDateIso,
    eventDateLabel: formatEventCertificateDate(eventDateIso),
    city: event.city,
    country: event.country,
    trackName,
    certificateId: buildEventCertificateId({
      eventType: event.eventType,
      city: event.city,
      eventDateIso,
      participantName,
      applicationId: application.id
    }),
    backgroundImageUrl: resolveEventDisplayBackgroundImageUrl(event, imageOptions)
  }
}
