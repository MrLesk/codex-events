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

export interface PublicHackathon {
  name: string
  slug: string
  description: string
  backgroundImageUrl: string | null
  bannerImageUrl: string | null
  city: string
  address: string
  registrationOpensAt: string
  registrationClosesAt: string
  submissionOpensAt: string
  submissionClosesAt: string
  state: PublicHackathonState
  maxTeamMembers: number
  requireXProfile: boolean
  requireLinkedinProfile: boolean
  requireGithubProfile: boolean
  requireLumaProfile: boolean
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

const compactDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric'
})

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

export function formatHackathonWindow(start: string, end: string) {
  return `${compactDateFormatter.format(new Date(start))} - ${fullDateFormatter.format(new Date(end))}`
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

export function listRequiredProfiles(hackathon: Pick<PublicHackathon, 'requireXProfile' | 'requireLinkedinProfile' | 'requireGithubProfile' | 'requireLumaProfile'>) {
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

  if (hackathon.requireLumaProfile) {
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
