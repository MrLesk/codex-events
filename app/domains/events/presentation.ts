import type { EventState } from '~/domains/events/states'

export type PublicEventState = EventState
export type PublicEventType = 'hackathon' | 'meetup' | 'build'

export interface PublicEventTermsReference {
  documentType: 'application_terms' | 'winner_terms'
  version: number
  title: string
  publishedAt: string
}

export interface PublicEventAgendaItem {
  id: string
  startsAt: string
  endsAt: string | null
  title: string
  details: string | null
  displayOrder: number
}

export interface PublicEventTrack {
  name: string
  description: string
  displayOrder: number
}

export interface PublicAgendaItemPresentation {
  dayLabel: string | null
  dateLabel: string | null
  timeLabel: string
  timeLines: string[]
  timeFlowDirection: 'down' | null
  metaLabel: string
}

export interface PublicDateTimePresentation {
  dayLabel: string
  dateLabel: string
  timeLabel: string
  metaLabel: string
}

export interface PublicEventStatePresentation {
  label: string
  color: 'neutral' | 'info' | 'warning' | 'primary' | 'success'
}

export interface PublicEvent {
  eventType: PublicEventType
  name: string
  slug: string
  description: string
  agendaItems: PublicEventAgendaItem[]
  tracks?: PublicEventTrack[]
  backgroundImageUrl: string | null
  bannerImageUrl: string | null
  lumaEventUrl?: string | null
  city: string
  country: string
  address: string
  registrationOpensAt: string
  registrationClosesAt: string
  submissionOpensAt: string
  submissionClosesAt: string
  state: PublicEventState
  maxTeamMembers: number
  autoApproveApplications: boolean
  inPersonEvent: boolean
  requireXProfile: boolean
  requireLinkedinProfile: boolean
  requireGithubProfile: boolean
  requireChatgptEmail: boolean
  requireOpenaiOrgId: boolean
  requireLumaEmail: boolean
  requireWhyThisEvent: boolean
  requireProofOfExecution: boolean
  requireSubmissionSummary: boolean
  requireSubmissionRepositoryUrl: boolean
  requireSubmissionDemoUrl: boolean
  currentTerms?: {
    applicationTerms: PublicEventTermsReference | null
    winnerTerms: PublicEventTermsReference | null
  }
}

export interface PublicEvaluationCriterion {
  name: string
  description: string
  weight: number
  displayOrder: number
}

export interface PublicPrize {
  name: string
  description: string
  rewardType: 'api_credits' | 'subscription' | 'physical' | 'other'
  rewardValue: string
  rewardCurrency: string | null
  awardScope: 'team' | 'member'
  rankStart: number
  rankEnd: number
  displayOrder: number
}

export interface PublicApiDataResponse<T> {
  data: T
}

export interface PublicApiListResponse<T> {
  data: T[]
  meta?: {
    page?: number
    pageSize?: number
    total?: number
  }
}

const stateLabels: Record<PublicEventState, string> = {
  draft: 'Draft',
  registration_open: 'Registration open',
  submission_open: 'Submission open',
  judging_preparation: 'Judging preparation',
  blind_review: 'Blind review',
  shortlist: 'Shortlist',
  pitch: 'Pitch',
  pitch_review: 'Pitch review',
  final_deliberation: 'Final deliberation',
  winners_announced: 'Winners announced',
  completed: 'Completed'
}

const stateColors: Record<PublicEventState, 'neutral' | 'info' | 'warning' | 'primary' | 'success'> = {
  draft: 'neutral',
  registration_open: 'info',
  submission_open: 'primary',
  judging_preparation: 'warning',
  blind_review: 'warning',
  shortlist: 'primary',
  pitch: 'primary',
  pitch_review: 'primary',
  final_deliberation: 'primary',
  winners_announced: 'success',
  completed: 'neutral'
}

const publicEventHeaderStateClasses: Record<PublicEventStatePresentation['color'], string> = {
  neutral: 'bg-white/[0.05] text-[#A3A3A3] border border-white/[0.08]',
  info: 'border border-sky-600/35 bg-sky-500/16 text-sky-800 dark:border-sky-400/35 dark:bg-sky-500/14 dark:text-sky-300',
  warning: 'bg-white/[0.05] text-[#A3A3A3] border border-white/[0.08]',
  primary: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  success: 'bg-green-500/10 text-green-400 border border-green-500/20'
}

const stateSummaries: Record<PublicEventState, string> = {
  draft: 'Configuration is still underway. Public participation has not opened yet.',
  registration_open: 'Applications are open. Team formation is available after approval.',
  submission_open: 'Approved participants can form teams and work on submissions.',
  judging_preparation: 'Team formation is closed. Existing submissions can still be finalized until judging starts.',
  blind_review: 'Judges are actively reviewing locked submissions in the blind workspace.',
  shortlist: 'Blind-review scores are locked in and finalists are being selected for the pitch stage.',
  pitch: 'Finalists are presenting live in order. Admins enable each team one at a time before post-pitch judge review opens.',
  pitch_review: 'Pitch presentations are over and judges can review full finalist details.',
  final_deliberation: 'Final combined scores are under review before winners are announced.',
  winners_announced: 'Final rankings are published and prize redemption can proceed.',
  completed: 'The program outcome is final and remains available for reference.'
}

const fullDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric'
})

const weekdayDateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric'
})

const compactDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric'
})

const weekdayFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'short'
})

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: '2-digit',
  minute: '2-digit'
})

const prizeNumberFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 20
})

function parseNumericPrizeRewardValue(value: string) {
  if (!/^-?\d+(?:\.\d+)?$/.test(value)) {
    return null
  }

  const numericValue = Number(value)

  return Number.isFinite(numericValue) ? numericValue : null
}

function isSameLocalDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate()
}

function formatAgendaDayContext(value: Date) {
  return `${weekdayFormatter.format(value)}, ${compactDateFormatter.format(value)}`
}

function hasDistinctAgendaEnd(startsAt: Date, endsAt: Date | null): endsAt is Date {
  return endsAt !== null && startsAt.getTime() !== endsAt.getTime()
}

function formatAgendaTimeLabel(startsAt: Date, endsAt: Date | null) {
  const startLabel = timeFormatter.format(startsAt)

  if (!hasDistinctAgendaEnd(startsAt, endsAt)) {
    return startLabel
  }

  if (isSameLocalDay(startsAt, endsAt)) {
    return `${startLabel} - ${timeFormatter.format(endsAt)}`
  }

  return `${startLabel} - ${formatAgendaDayContext(endsAt)} | ${timeFormatter.format(endsAt)}`
}

function getAgendaTimeLines(startsAt: Date, endsAt: Date | null) {
  const startLabel = timeFormatter.format(startsAt)

  if (!hasDistinctAgendaEnd(startsAt, endsAt)) {
    return [startLabel]
  }

  if (isSameLocalDay(startsAt, endsAt)) {
    return [startLabel, timeFormatter.format(endsAt)]
  }

  return [`${startLabel} - ${formatAgendaDayContext(endsAt)} | ${timeFormatter.format(endsAt)}`]
}

export function formatEventStateLabel(state: PublicEventState) {
  return stateLabels[state]
}

export function resolveEventStateColor(state: PublicEventState) {
  return stateColors[state]
}

export function summarizeEventState(state: PublicEventState) {
  return stateSummaries[state]
}

export function getPublicEventStatePresentation(
  event: Pick<PublicEvent, 'state'> & Partial<Pick<PublicEvent, 'registrationOpensAt' | 'registrationClosesAt'>>,
  now = new Date()
): PublicEventStatePresentation {
  if (event.state === 'registration_open' && event.registrationOpensAt && event.registrationClosesAt) {
    const registrationWindowStatus = describeEventWindowStatus(
      event.registrationOpensAt,
      event.registrationClosesAt,
      now
    )

    if (registrationWindowStatus === 'Upcoming') {
      return {
        label: 'Upcoming',
        color: 'neutral'
      }
    }

    if (registrationWindowStatus === 'Closed') {
      return {
        label: 'Registration closed',
        color: 'neutral'
      }
    }
  }

  return {
    label: formatEventStateLabel(event.state),
    color: resolveEventStateColor(event.state)
  }
}

export function resolvePublicEventHeaderStateClass(
  event: Pick<PublicEvent, 'state'> & Partial<Pick<PublicEvent, 'registrationOpensAt' | 'registrationClosesAt'>>,
  now = new Date()
) {
  return publicEventHeaderStateClasses[getPublicEventStatePresentation(event, now).color]
}

export function formatEventDate(value: string) {
  return fullDateFormatter.format(new Date(value))
}

export function formatEventDateWithWeekday(value: string) {
  return weekdayDateFormatter.format(new Date(value))
}

export function formatEventTime(value: string) {
  return timeFormatter.format(new Date(value))
}

export function formatEventLocation(location: { city: string, country: string }) {
  const city = location.city.trim()
  const country = location.country.trim()

  if (!city) {
    return country
  }

  if (!country || city === country) {
    return city
  }

  return `${city}, ${country}`
}

export function formatEventCompactDate(value: string) {
  return compactDateFormatter.format(new Date(value))
}

export function formatEventWindow(start: string, end: string) {
  return `${compactDateFormatter.format(new Date(start))} - ${fullDateFormatter.format(new Date(end))}`
}

export function getEventDateTimePresentation(value: string): PublicDateTimePresentation {
  const date = new Date(value)
  const dayLabel = weekdayFormatter.format(date)
  const dateLabel = compactDateFormatter.format(date)
  const timeLabel = timeFormatter.format(date)

  return {
    dayLabel,
    dateLabel,
    timeLabel,
    metaLabel: `${dayLabel}, ${dateLabel} | ${timeLabel}`
  }
}

export function describeEventWindowStatus(start: string, end: string, now = new Date()) {
  const startAt = new Date(start)
  const endAt = new Date(end)

  if (now < startAt) {
    return 'Upcoming'
  }

  if (now >= endAt) {
    return 'Closed'
  }

  return 'Open now'
}

export function getEventWindowProgress(start: string, end: string, now = new Date()) {
  const startAt = new Date(start).getTime()
  const endAt = new Date(end).getTime()
  const currentTime = now.getTime()

  if (currentTime <= startAt) {
    return 8
  }

  if (currentTime >= endAt || endAt <= startAt) {
    return 100
  }

  return Math.max(8, Math.min(99, Math.round(((currentTime - startAt) / (endAt - startAt)) * 100)))
}

export function describeEventWindowNote(start: string, end: string, now = new Date()) {
  const startAt = new Date(start)
  const endAt = new Date(end)

  if (now < startAt) {
    return `Opens ${formatEventCompactDate(start)}`
  }

  if (now >= endAt) {
    return `Closed ${formatEventCompactDate(end)}`
  }

  if (isSameLocalDay(now, endAt)) {
    return `Closes at ${formatEventTime(end)}`
  }

  return `Closes ${formatEventCompactDate(end)}`
}

export function getEventEarliestStartAt(
  event: Pick<PublicEvent, 'agendaItems' | 'submissionOpensAt'>
) {
  let earliestAgendaStartAt: string | null = null
  let earliestAgendaTimestamp = Number.POSITIVE_INFINITY

  for (const item of event.agendaItems) {
    const startsAtTimestamp = Date.parse(item.startsAt)

    if (Number.isNaN(startsAtTimestamp) || startsAtTimestamp >= earliestAgendaTimestamp) {
      continue
    }

    earliestAgendaTimestamp = startsAtTimestamp
    earliestAgendaStartAt = item.startsAt
  }

  return earliestAgendaStartAt ?? event.submissionOpensAt
}

export function shouldShowAgendaDayContext(
  items: Pick<PublicEventAgendaItem, 'startsAt' | 'endsAt'>[]
) {
  if (items.length === 0) {
    return false
  }

  let earliestTimestamp = Number.POSITIVE_INFINITY
  let latestTimestamp = Number.NEGATIVE_INFINITY

  for (const item of items) {
    earliestTimestamp = Math.min(earliestTimestamp, new Date(item.startsAt).getTime())
    latestTimestamp = Math.max(latestTimestamp, new Date(item.endsAt ?? item.startsAt).getTime())
  }

  return !isSameLocalDay(new Date(earliestTimestamp), new Date(latestTimestamp))
}

export function getAgendaItemPresentation(
  item: Pick<PublicEventAgendaItem, 'startsAt' | 'endsAt'>,
  showDayContext: boolean
): PublicAgendaItemPresentation {
  const startsAt = new Date(item.startsAt)
  const endsAt = item.endsAt ? new Date(item.endsAt) : null
  const timeLabel = formatAgendaTimeLabel(startsAt, endsAt)
  const timeLines = getAgendaTimeLines(startsAt, endsAt)
  const timeFlowDirection = timeLines.length > 1 ? 'down' : null

  if (!showDayContext) {
    return {
      dayLabel: null,
      dateLabel: null,
      timeLabel,
      timeLines,
      timeFlowDirection,
      metaLabel: timeLabel
    }
  }

  const dayLabel = weekdayFormatter.format(startsAt)
  const dateLabel = compactDateFormatter.format(startsAt)

  return {
    dayLabel,
    dateLabel,
    timeLabel,
    timeLines,
    timeFlowDirection,
    metaLabel: `${dayLabel}, ${dateLabel} | ${timeLabel}`
  }
}

export function describeWindowStatus(
  state: PublicEventState,
  window: 'registration' | 'submission'
) {
  if (window === 'registration') {
    if (state === 'registration_open') {
      return 'Open now'
    }

    return state === 'draft' ? 'Upcoming' : 'Closed'
  }

  if (state === 'submission_open') {
    return 'Open now'
  }

  return state === 'draft' || state === 'registration_open' ? 'Upcoming' : 'Closed'
}

export function listRequiredProfiles(event: Pick<PublicEvent, 'requireXProfile' | 'requireLinkedinProfile' | 'requireGithubProfile' | 'requireChatgptEmail' | 'requireOpenaiOrgId' | 'requireLumaEmail'>) {
  const profiles: string[] = []

  if (event.requireXProfile) {
    profiles.push('X')
  }

  if (event.requireLinkedinProfile) {
    profiles.push('LinkedIn')
  }

  if (event.requireGithubProfile) {
    profiles.push('GitHub')
  }

  if (event.requireChatgptEmail) {
    profiles.push('ChatGPT email')
  }

  if (event.requireOpenaiOrgId) {
    profiles.push('OpenAI org ID')
  }

  if (event.requireLumaEmail) {
    profiles.push('Luma email')
  }

  return profiles
}

export function formatPrizeRank(prize: Pick<PublicPrize, 'rankStart' | 'rankEnd'>) {
  return prize.rankStart === prize.rankEnd
    ? `Rank ${prize.rankStart}`
    : `Ranks ${prize.rankStart}-${prize.rankEnd}`
}

export function formatPrizeReward(prize: Pick<PublicPrize, 'rewardValue' | 'rewardCurrency'>) {
  const numericRewardValue = parseNumericPrizeRewardValue(prize.rewardValue)

  if (numericRewardValue === null) {
    return prize.rewardValue
  }

  if (!prize.rewardCurrency) {
    return prizeNumberFormatter.format(numericRewardValue)
  }

  const currency = prize.rewardCurrency.toUpperCase()

  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency
    }).format(numericRewardValue)
  } catch {
    return `${prizeNumberFormatter.format(numericRewardValue)} ${currency}`
  }
}

export function formatPrizeScope(scope: PublicPrize['awardScope']) {
  return scope === 'team' ? 'Team award' : 'Member award'
}

export function formatTermsDocumentType(documentType: PublicEventTermsReference['documentType']) {
  return documentType === 'application_terms' ? 'Application terms' : 'Winner terms'
}

export function formatMaxTeamMembers(maxTeamMembers: number) {
  return `Maximum ${maxTeamMembers} team members`
}
