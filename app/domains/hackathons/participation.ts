import type { PublicHackathonState } from '~/domains/hackathons/presentation'
import type { TeamSubmissionRecord } from '~/domains/submissions/team-submission'

import { normalizeParticipantApiError } from '~/domains/applications/participant-application'

export interface HackathonParticipationHackathonSummary {
  id: string
  name: string
  slug: string
  city: string
  country: string
  state: PublicHackathonState
  startsAt: string
  registrationOpensAt: string
  registrationClosesAt: string
  submissionClosesAt: string
}

export interface HackathonParticipationApplicationSummary {
  id: string
  status: 'submitted' | 'approved' | 'rejected' | 'withdrawn'
  submittedAt: string
  withdrawnAt: string | null
  reviewedAt: string | null
  updatedAt: string
}

export interface HackathonParticipationTeamSummary {
  id: string
  name: string
  slug: string
  membershipRole: 'member' | 'admin'
  joinedAt: string
  leftAt: string | null
  isActiveMembership: boolean
  activeMemberCount: number
}

export interface HackathonParticipationPrizeSummary {
  id: string
  name: string
}

export interface HackathonParticipationOutcomeSummary {
  isShortlisted: boolean
  isWinner: boolean
  finalRank: number | null
  rankedTeamCount: number
  prizes: HackathonParticipationPrizeSummary[]
}

export interface HackathonParticipationRankSummary {
  basis: 'final' | 'blind_review'
  rank: number
  rankedTeamCount: number
  totalTeamCount: number
}

export interface HackathonParticipationRecord {
  hackathon: HackathonParticipationHackathonSummary
  isPast: boolean
  lastActivityAt: string
  application: HackathonParticipationApplicationSummary | null
  activeTeam: HackathonParticipationTeamSummary | null
  latestTeam: HackathonParticipationTeamSummary | null
  latestSubmission: TeamSubmissionRecord | null
  outcome: HackathonParticipationOutcomeSummary | null
}

export interface HackathonParticipationPayload {
  current: HackathonParticipationRecord[]
  past: HackathonParticipationRecord[]
}

export interface HackathonParticipationApiDataResponse<T> {
  data: T
}

export interface HackathonParticipationPrimaryAction {
  href: string
  label: string
}

export interface HackathonParticipationOutcomeNotice {
  color: 'success' | 'info' | 'neutral'
  title: string
  description: string
}

export function normalizeHackathonParticipationApiError(error: unknown) {
  return normalizeParticipantApiError(error)
}

export function getHackathonParticipationOutcomeNotice(
  record: {
    hackathon: Pick<HackathonParticipationHackathonSummary, 'state'>
    activeTeam?: Pick<HackathonParticipationTeamSummary, 'name'> | null
    latestTeam?: Pick<HackathonParticipationTeamSummary, 'name'> | null
    outcome: HackathonParticipationOutcomeSummary | null
  }
): HackathonParticipationOutcomeNotice | null {
  const outcome = record.outcome

  if (!outcome) {
    return null
  }

  const teamName = record.activeTeam?.name ?? record.latestTeam?.name ?? 'Your team'

  if (['pitch', 'pitch_review', 'final_deliberation'].includes(record.hackathon.state)) {
    if (!outcome.isShortlisted) {
      return null
    }

    return {
      color: 'info',
      title: 'Your team is shortlisted',
      description: `${teamName} advanced to the live pitch stage.`
    }
  }

  return null
}

export function getHackathonParticipationRankNotice(input: {
  hackathonState: PublicHackathonState
  teamName?: string | null
  rankSummary: HackathonParticipationRankSummary | null
}): HackathonParticipationOutcomeNotice | null {
  if (input.hackathonState !== 'completed' || !input.rankSummary) {
    return null
  }

  const teamName = input.teamName?.trim() || 'Your team'
  const rankLabel = `#${input.rankSummary.rank} out of ${input.rankSummary.totalTeamCount}`

  if (input.rankSummary.basis === 'final') {
    return {
      color: 'info',
      title: 'Your final placement',
      description: `${teamName} finished ${rankLabel} in the completed final ranking.`
    }
  }

  return {
    color: 'info',
    title: 'Your blind-review placement',
    description: `${teamName} finished ${rankLabel} in blind review. Teams below the finalist cutoff do not receive a final placement.`
  }
}

export function getHackathonParticipationPrimaryAction(
  record: Pick<HackathonParticipationRecord, 'hackathon' | 'application' | 'activeTeam'>
): HackathonParticipationPrimaryAction {
  return {
    href: `/account/hackathons/${record.hackathon.slug}`,
    label: 'Open overview'
  }
}

export function formatParticipationStatusLabel(record: HackathonParticipationRecord) {
  if (record.application?.status === 'approved') {
    return 'Approved'
  }

  if (record.application?.status === 'submitted') {
    return 'Pending review'
  }

  if (record.application?.status === 'rejected') {
    return 'Not approved'
  }

  if (record.application?.status === 'withdrawn') {
    return 'Withdrawn'
  }

  if (record.activeTeam) {
    return 'Team active'
  }

  if (record.latestSubmission?.status === 'submitted' || record.latestSubmission?.status === 'locked') {
    return 'Project submitted'
  }

  if (record.latestSubmission?.status === 'draft') {
    return 'Draft saved'
  }

  if (record.latestTeam) {
    return 'Participated'
  }

  return 'Participation'
}

export function getParticipationStatusColor(record: HackathonParticipationRecord) {
  if (record.application?.status === 'approved') {
    return 'success'
  }

  if (record.application?.status === 'submitted') {
    return 'warning'
  }

  if (record.application?.status === 'rejected') {
    return 'error'
  }

  if (record.application?.status === 'withdrawn') {
    return 'neutral'
  }

  if (record.activeTeam) {
    return 'primary'
  }

  if (record.latestSubmission?.status === 'submitted') {
    return 'primary'
  }

  if (record.latestSubmission?.status === 'locked') {
    return 'info'
  }

  if (record.latestSubmission?.status === 'draft') {
    return 'warning'
  }

  return 'neutral'
}

export function formatParticipationStageLabel(record: HackathonParticipationRecord) {
  if (record.application) {
    if (record.application.status === 'withdrawn') {
      return 'Application withdrawn'
    }

    return 'Application submitted'
  }

  if (record.latestSubmission?.status === 'submitted' || record.latestSubmission?.status === 'locked') {
    return 'Project submitted'
  }

  if (record.latestSubmission?.status === 'draft') {
    return 'Draft saved'
  }

  if (record.activeTeam) {
    return 'Team active'
  }

  return null
}

export function getParticipationStageColor(record: HackathonParticipationRecord) {
  if (record.application) {
    return 'neutral'
  }

  if (record.latestSubmission?.status === 'submitted') {
    return 'primary'
  }

  if (record.latestSubmission?.status === 'locked') {
    return 'info'
  }

  if (record.latestSubmission?.status === 'draft') {
    return 'warning'
  }

  if (record.activeTeam) {
    return 'primary'
  }

  return 'neutral'
}
