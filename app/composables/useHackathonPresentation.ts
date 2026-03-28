export type PublicHackathonState
  = 'draft'
    | 'registration_open'
    | 'submission_open'
    | 'judging_preparation'
    | 'judge_review'
    | 'shortlist'
    | 'winners_announced'
    | 'completed'

export interface PublicHackathonTermsReference {
  documentType: 'application_terms' | 'winner_terms'
  version: number
  title: string
  publishedAt: string
}

export interface PublicHackathonAgendaItem {
  id: string
  startsAt: string
  endsAt: string | null
  title: string
  details: string | null
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

export interface PublicHackathon {
  name: string
  slug: string
  description: string
  agendaItems: PublicHackathonAgendaItem[]
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
  state: PublicHackathonState
  maxTeamMembers: number
  inPersonEvent: boolean
  requireXProfile: boolean
  requireLinkedinProfile: boolean
  requireGithubProfile: boolean
  requireChatgptEmail: boolean
  requireOpenaiOrgId: boolean
  requireLumaProfile: boolean
  requireWhyThisHackathon: boolean
  requireProofOfExecution: boolean
  currentTerms?: {
    applicationTerms: PublicHackathonTermsReference | null
    winnerTerms: PublicHackathonTermsReference | null
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

const stateLabels: Record<PublicHackathonState, string> = {
  draft: 'Draft',
  registration_open: 'Registration open',
  submission_open: 'Submission open',
  judging_preparation: 'Judging preparation',
  judge_review: 'Judge review',
  shortlist: 'Shortlist',
  winners_announced: 'Winners announced',
  completed: 'Completed'
}

const stateColors: Record<PublicHackathonState, 'neutral' | 'info' | 'warning' | 'primary' | 'success'> = {
  draft: 'neutral',
  registration_open: 'info',
  submission_open: 'primary',
  judging_preparation: 'warning',
  judge_review: 'warning',
  shortlist: 'primary',
  winners_announced: 'success',
  completed: 'neutral'
}

const stateSummaries: Record<PublicHackathonState, string> = {
  draft: 'Configuration is still underway. Public participation has not opened yet.',
  registration_open: 'Applications are open. Team formation is available after approval.',
  submission_open: 'Approved participants can form teams and work on submissions.',
  judging_preparation: 'Submissions are locked while judging assignments are prepared.',
  judge_review: 'Judges are actively reviewing locked submissions in the blind workspace.',
  shortlist: 'Scores are computed and finalists are under final review before announcement.',
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

function isSameLocalDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate()
}

function formatAgendaDayContext(value: Date) {
  return `${weekdayFormatter.format(value)}, ${compactDateFormatter.format(value)}`
}

function formatAgendaTimeLabel(startsAt: Date, endsAt: Date | null) {
  const startLabel = timeFormatter.format(startsAt)

  if (!endsAt) {
    return startLabel
  }

  if (isSameLocalDay(startsAt, endsAt)) {
    return `${startLabel} - ${timeFormatter.format(endsAt)}`
  }

  return `${startLabel} - ${formatAgendaDayContext(endsAt)} | ${timeFormatter.format(endsAt)}`
}

function getAgendaTimeLines(startsAt: Date, endsAt: Date | null) {
  const startLabel = timeFormatter.format(startsAt)

  if (!endsAt) {
    return [startLabel]
  }

  if (isSameLocalDay(startsAt, endsAt)) {
    return [startLabel, timeFormatter.format(endsAt)]
  }

  return [`${startLabel} - ${formatAgendaDayContext(endsAt)} | ${timeFormatter.format(endsAt)}`]
}

export function formatHackathonStateLabel(state: PublicHackathonState) {
  return stateLabels[state]
}

export function resolveHackathonStateColor(state: PublicHackathonState) {
  return stateColors[state]
}

export function summarizeHackathonState(state: PublicHackathonState) {
  return stateSummaries[state]
}

export function formatHackathonDate(value: string) {
  return fullDateFormatter.format(new Date(value))
}

export function formatHackathonDateWithWeekday(value: string) {
  return weekdayDateFormatter.format(new Date(value))
}

export function formatHackathonLocation(location: { city: string, country: string }) {
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

export function formatHackathonCompactDate(value: string) {
  return compactDateFormatter.format(new Date(value))
}

export function formatHackathonWindow(start: string, end: string) {
  return `${compactDateFormatter.format(new Date(start))} - ${fullDateFormatter.format(new Date(end))}`
}

export function getHackathonEarliestStartAt(
  hackathon: Pick<PublicHackathon, 'agendaItems' | 'submissionOpensAt'>
) {
  let earliestAgendaStartAt: string | null = null
  let earliestAgendaTimestamp = Number.POSITIVE_INFINITY

  for (const item of hackathon.agendaItems) {
    const startsAtTimestamp = Date.parse(item.startsAt)

    if (Number.isNaN(startsAtTimestamp) || startsAtTimestamp >= earliestAgendaTimestamp) {
      continue
    }

    earliestAgendaTimestamp = startsAtTimestamp
    earliestAgendaStartAt = item.startsAt
  }

  return earliestAgendaStartAt ?? hackathon.submissionOpensAt
}

export function shouldShowAgendaDayContext(
  items: Pick<PublicHackathonAgendaItem, 'startsAt' | 'endsAt'>[]
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
  item: Pick<PublicHackathonAgendaItem, 'startsAt' | 'endsAt'>,
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
  state: PublicHackathonState,
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

export function listRequiredProfiles(hackathon: Pick<PublicHackathon, 'requireXProfile' | 'requireLinkedinProfile' | 'requireGithubProfile' | 'requireChatgptEmail' | 'requireOpenaiOrgId' | 'requireLumaProfile' | 'lumaEventUrl'>) {
  const profiles: string[] = []

  if (hackathon.requireXProfile) {
    profiles.push('X')
  }

  if (hackathon.requireLinkedinProfile) {
    profiles.push('LinkedIn')
  }

  if (hackathon.requireGithubProfile) {
    profiles.push('GitHub')
  }

  if (hackathon.requireChatgptEmail) {
    profiles.push('ChatGPT email')
  }

  if (hackathon.requireOpenaiOrgId) {
    profiles.push('OpenAI org ID')
  }

  if (hackathon.requireLumaProfile && Boolean(hackathon.lumaEventUrl?.trim())) {
    profiles.push('Luma')
  }

  return profiles
}

export function formatPrizeRank(prize: Pick<PublicPrize, 'rankStart' | 'rankEnd'>) {
  return prize.rankStart === prize.rankEnd
    ? `Rank ${prize.rankStart}`
    : `Ranks ${prize.rankStart}-${prize.rankEnd}`
}

export function formatPrizeReward(prize: Pick<PublicPrize, 'rewardValue' | 'rewardCurrency'>) {
  return prize.rewardCurrency ? `${prize.rewardValue} ${prize.rewardCurrency}` : prize.rewardValue
}

export function formatPrizeScope(scope: PublicPrize['awardScope']) {
  return scope === 'team' ? 'Team award' : 'Member award'
}

export function formatTermsDocumentType(documentType: PublicHackathonTermsReference['documentType']) {
  return documentType === 'application_terms' ? 'Application terms' : 'Winner terms'
}

export function formatMaxTeamMembers(maxTeamMembers: number) {
  return `Maximum ${maxTeamMembers} team members`
}
