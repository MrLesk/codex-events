import type { PublicHackathonState } from '~/composables/useHackathonPresentation'
import type { TeamSubmissionRecord } from '~/utils/team-submission'

import { normalizeParticipantApiError } from './participant-application'

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

export interface HackathonParticipationRecord {
  hackathon: HackathonParticipationHackathonSummary
  isPast: boolean
  lastActivityAt: string
  application: HackathonParticipationApplicationSummary | null
  activeTeam: HackathonParticipationTeamSummary | null
  latestTeam: HackathonParticipationTeamSummary | null
  latestSubmission: TeamSubmissionRecord | null
}

export interface HackathonParticipationPayload {
  current: HackathonParticipationRecord[]
  past: HackathonParticipationRecord[]
}

export interface HackathonParticipationApiDataResponse<T> {
  data: T
}

export function normalizeHackathonParticipationApiError(error: unknown) {
  return normalizeParticipantApiError(error)
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
