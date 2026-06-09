export const eventCertificateEventTypes = ['hackathon', 'meetup', 'build'] as const

export type EventCertificateEventType = typeof eventCertificateEventTypes[number]

export interface EventCertificate {
  participantName: string
  eventName: string
  eventSlug: string
  eventType: EventCertificateEventType
  eventDateIso: string
  eventDateLabel: string
  city: string
  country: string
  trackName: string | null
  certificateId: string
  backgroundImageUrl: string | null
}

export const eventCertificateTypeLabels: Record<EventCertificateEventType, string> = {
  hackathon: 'Hackathon',
  meetup: 'Meetup',
  build: 'Build'
}

const eventCertificateTypeCodes: Record<EventCertificateEventType, string> = {
  hackathon: 'HCK',
  meetup: 'MTP',
  build: 'BLD'
}

const certificateDateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC'
})

function toCertificateIdSegment(value: string, maxLength: number) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, maxLength)
}

export function resolveEventCertificateDateIso(
  agendaItems: { startsAt: string }[],
  submissionOpensAt: string
) {
  let earliestStartAt: string | null = null
  let earliestTimestamp = Number.POSITIVE_INFINITY

  for (const item of agendaItems) {
    const startsAtTimestamp = Date.parse(item.startsAt)

    if (Number.isNaN(startsAtTimestamp) || startsAtTimestamp >= earliestTimestamp) {
      continue
    }

    earliestTimestamp = startsAtTimestamp
    earliestStartAt = item.startsAt
  }

  return earliestStartAt ?? submissionOpensAt
}

export function formatEventCertificateDate(iso: string) {
  return certificateDateFormatter.format(new Date(iso))
}

export function buildEventCertificateId(input: {
  eventType: EventCertificateEventType
  city: string
  eventDateIso: string
  participantName: string
  applicationId: string
}) {
  const citySegment = toCertificateIdSegment(input.city, 3) || 'EVT'
  const eventDate = new Date(input.eventDateIso)
  const year = String(eventDate.getUTCFullYear())
  const monthDay = `${String(eventDate.getUTCMonth() + 1).padStart(2, '0')}${String(eventDate.getUTCDate()).padStart(2, '0')}`

  const nameWords = input.participantName.trim().split(/\s+/)
  const lastWord = nameWords[nameWords.length - 1] ?? ''
  const initials = nameWords.length > 1 ? toCertificateIdSegment(nameWords[0] ?? '', 1) : ''
  const nameSegment = toCertificateIdSegment(`${initials}${toCertificateIdSegment(lastWord, 11)}`, 12)
    || toCertificateIdSegment(input.applicationId.replace(/-/g, ''), 6)

  return `${eventCertificateTypeCodes[input.eventType]}-${citySegment}-${year}-${monthDay}-${nameSegment}`
}

export function buildEventCertificatePath(eventSlug: string, userId: string) {
  return `/events/${eventSlug}/${userId}`
}

export function buildEventCertificateSummary(certificate: Pick<EventCertificate, 'participantName' | 'eventName' | 'eventDateLabel' | 'trackName'>) {
  const statement = `${certificate.participantName} has participated in ${certificate.eventName} on ${certificate.eventDateLabel}.`

  return certificate.trackName
    ? `${statement} Track: ${certificate.trackName}.`
    : statement
}
