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
  registrationOpensAt: string
  submissionClosesAt: string
}

export interface HackathonParticipationApplicationSummary {
  id: string
  status: 'submitted' | 'approved' | 'rejected'
  submittedAt: string
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

const fullDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric'
})

export function normalizeHackathonParticipationApiError(error: unknown) {
  return normalizeParticipantApiError(error)
}

export function formatParticipationDate(value: string | null | undefined) {
  if (!value) {
    return 'Not recorded'
  }

  return fullDateFormatter.format(new Date(value))
}

export function formatParticipationStatusLabel(record: HackathonParticipationRecord) {
  if (record.activeTeam) {
    return 'Active team'
  }

  if (record.application?.status === 'approved') {
    return record.latestTeam ? 'Alumni team member' : 'Approved'
  }

  if (record.application?.status === 'submitted') {
    return 'Application submitted'
  }

  if (record.application?.status === 'rejected') {
    return 'Application rejected'
  }

  return 'Participation'
}

export function getParticipationStatusColor(record: HackathonParticipationRecord) {
  if (record.activeTeam) {
    return 'primary'
  }

  if (record.application?.status === 'approved') {
    return 'success'
  }

  if (record.application?.status === 'submitted') {
    return 'warning'
  }

  if (record.application?.status === 'rejected') {
    return 'error'
  }

  return 'neutral'
}

export function summarizeParticipationRecord(record: HackathonParticipationRecord) {
  if (record.activeTeam) {
    if (record.latestSubmission?.status === 'submitted') {
      return 'Your team has an active submitted project in this hackathon.'
    }

    if (record.latestSubmission?.status === 'draft') {
      return 'Your team is currently active and working on a draft submission.'
    }

    return 'You are currently active on a team in this hackathon.'
  }

  if (record.application?.status === 'approved') {
    return record.latestTeam
      ? 'You participated previously through a team in this hackathon.'
      : 'You were approved for this hackathon.'
  }

  if (record.application?.status === 'submitted') {
    return 'Your application is still pending review.'
  }

  if (record.application?.status === 'rejected') {
    return 'Your application outcome was rejected.'
  }

  return 'Participation history is available for this hackathon.'
}
