import type { PublicHackathon } from '../composables/useHackathonPresentation'

import { normalizeParticipantApiError } from './participant-application'

export interface TeamSubmissionRecord {
  id: string
  teamId: string
  status: 'draft' | 'submitted' | 'withdrawn' | 'locked' | 'disqualified'
  projectName: string | null
  summary: string | null
  repositoryUrl: string | null
  demoUrl: string | null
  submittedAt: string | null
  lockedAt: string | null
  withdrawnAt: string | null
  disqualifiedAt: string | null
  createdAt: string
  updatedAt: string
}

export type TeamSubmissionWorkspaceStatus = TeamSubmissionRecord['status'] | 'none'

export interface TeamSubmissionActionAvailability {
  isAllowed: boolean
  reason?: string
}

export interface TeamSubmissionFormInput {
  projectName?: string | null
  summary?: string | null
  repositoryUrl?: string | null
  demoUrl?: string | null
}

export function normalizeTeamSubmissionApiError(error: unknown) {
  return normalizeParticipantApiError(error)
}

export function getTeamSubmissionWorkspaceStatus(submission: TeamSubmissionRecord | null | undefined): TeamSubmissionWorkspaceStatus {
  return submission?.status ?? 'none'
}

export function formatTeamSubmissionStatus(status: TeamSubmissionWorkspaceStatus) {
  switch (status) {
    case 'draft':
      return 'Draft'
    case 'submitted':
      return 'Submitted'
    case 'withdrawn':
      return 'Withdrawn'
    case 'locked':
      return 'Locked'
    case 'disqualified':
      return 'Disqualified'
    default:
      return 'No submission'
  }
}

export function getTeamSubmissionStatusColor(status: TeamSubmissionWorkspaceStatus) {
  switch (status) {
    case 'draft':
      return 'warning'
    case 'submitted':
      return 'primary'
    case 'withdrawn':
      return 'neutral'
    case 'locked':
      return 'info'
    case 'disqualified':
      return 'error'
    default:
      return 'neutral'
  }
}

export function hasHackathonEnteredSubmissionPhase(hackathon: Pick<PublicHackathon, 'state'>) {
  return hackathon.state !== 'draft' && hackathon.state !== 'registration_open'
}

export function shouldShowParticipantSubmissionWorkspace(
  hackathon: Pick<PublicHackathon, 'state'>,
  hasTeamMembership: boolean
) {
  return hasTeamMembership && hasHackathonEnteredSubmissionPhase(hackathon)
}

export function getTeamSubmissionStateSummary(
  hackathon: Pick<PublicHackathon, 'state'>,
  submission: TeamSubmissionRecord | null | undefined
) {
  if (!submission) {
    if (hackathon.state === 'submission_open') {
      return 'This team has not started a project submission yet. Team admins can create the first draft while submission is open.'
    }

    if (hackathon.state === 'registration_open') {
      return 'This team does not have a project submission yet. Submission drafting starts only after admins open the submission phase.'
    }

    return 'This team does not have an active submission record for the current hackathon lifecycle.'
  }

  switch (submission.status) {
    case 'draft':
      return 'This draft is still private to the team and can be edited, submitted, or withdrawn while submission remains open.'
    case 'submitted':
      return 'This project is submitted and can still be revised or withdrawn while the hackathon remains in submission_open.'
    case 'withdrawn':
      return 'This project was withdrawn before judging preparation and is no longer part of the competition.'
    case 'locked':
      return 'This project is locked for judging and can no longer be edited or withdrawn.'
    case 'disqualified':
      return 'This project was removed from competition by admin action and remains read-only in the participant workspace.'
  }
}

function requireTeamAdminAccess(canManageSubmission: boolean) {
  if (!canManageSubmission) {
    return {
      isAllowed: false,
      reason: 'Only team admins can manage the project submission.'
    } satisfies TeamSubmissionActionAvailability
  }

  return null
}

export function getCreateSubmissionAvailability(
  hackathon: Pick<PublicHackathon, 'state'>,
  submission: TeamSubmissionRecord | null | undefined,
  canManageSubmission: boolean
): TeamSubmissionActionAvailability {
  const adminRequirement = requireTeamAdminAccess(canManageSubmission)

  if (adminRequirement) {
    return adminRequirement
  }

  if (submission) {
    return {
      isAllowed: false,
      reason: 'This team already has a submission record.'
    }
  }

  if (hackathon.state !== 'submission_open') {
    return {
      isAllowed: false,
      reason: 'The first submission draft can be created only while submission is open.'
    }
  }

  return {
    isAllowed: true
  }
}

export function getUpdateSubmissionAvailability(
  hackathon: Pick<PublicHackathon, 'state'>,
  submission: TeamSubmissionRecord | null | undefined,
  canManageSubmission: boolean
): TeamSubmissionActionAvailability {
  const adminRequirement = requireTeamAdminAccess(canManageSubmission)

  if (adminRequirement) {
    return adminRequirement
  }

  if (!submission) {
    return {
      isAllowed: false,
      reason: 'Start the first draft before editing the project submission.'
    }
  }

  if (hackathon.state !== 'submission_open') {
    return {
      isAllowed: false,
      reason: 'Project edits are available only while submission is open.'
    }
  }

  if (submission.status !== 'draft' && submission.status !== 'submitted') {
    return {
      isAllowed: false,
      reason: submission.status === 'withdrawn'
        ? 'Withdrawn submissions remain read-only.'
        : submission.status === 'locked'
          ? 'Locked submissions cannot be edited.'
          : 'Disqualified submissions remain read-only.'
    }
  }

  return {
    isAllowed: true
  }
}

export function getSubmitSubmissionAvailability(
  hackathon: Pick<PublicHackathon, 'state'>,
  submission: TeamSubmissionRecord | null | undefined,
  canManageSubmission: boolean
): TeamSubmissionActionAvailability {
  const adminRequirement = requireTeamAdminAccess(canManageSubmission)

  if (adminRequirement) {
    return adminRequirement
  }

  if (!submission) {
    return {
      isAllowed: false,
      reason: 'Create the first draft before submitting the project.'
    }
  }

  if (hackathon.state !== 'submission_open') {
    return {
      isAllowed: false,
      reason: 'Project submission is available only while submission is open.'
    }
  }

  if (submission.status !== 'draft') {
    return {
      isAllowed: false,
      reason: submission.status === 'submitted'
        ? 'This project is already submitted.'
        : submission.status === 'withdrawn'
          ? 'Withdrawn submissions cannot be resubmitted.'
          : submission.status === 'locked'
            ? 'Locked submissions are already in judging.'
            : 'Disqualified submissions cannot be submitted.'
    }
  }

  return {
    isAllowed: true
  }
}

export function getWithdrawSubmissionAvailability(
  hackathon: Pick<PublicHackathon, 'state'>,
  submission: TeamSubmissionRecord | null | undefined,
  canManageSubmission: boolean
): TeamSubmissionActionAvailability {
  const adminRequirement = requireTeamAdminAccess(canManageSubmission)

  if (adminRequirement) {
    return adminRequirement
  }

  if (!submission) {
    return {
      isAllowed: false,
      reason: 'There is no submission to withdraw for this team.'
    }
  }

  if (hackathon.state !== 'submission_open') {
    return {
      isAllowed: false,
      reason: 'Submissions can be withdrawn only before judging preparation begins.'
    }
  }

  if (submission.status !== 'draft' && submission.status !== 'submitted') {
    return {
      isAllowed: false,
      reason: submission.status === 'withdrawn'
        ? 'This submission is already withdrawn.'
        : submission.status === 'locked'
          ? 'Locked submissions cannot be withdrawn.'
          : 'Disqualified submissions cannot be withdrawn.'
    }
  }

  return {
    isAllowed: true
  }
}
