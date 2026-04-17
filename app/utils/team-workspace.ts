import type { PublicHackathon } from '../composables/useHackathonPresentation'
import type {
  ParticipantActor,
  ParticipantApiDataResponse,
  ParticipantApiListResponse,
  ParticipantSessionUser
} from './participant-application'

import {
  buildAnonymousParticipantActor,
  buildAuthenticatedIdentityParticipantActor,
  normalizeParticipantApiError
} from './participant-application'

export type TeamWorkspaceActor = ParticipantActor
export type TeamWorkspaceApiDataResponse<T> = ParticipantApiDataResponse<T>
export type TeamWorkspaceApiListResponse<T> = ParticipantApiListResponse<T>

export interface TeamUserSummary {
  id: string
  displayName: string
  email?: string | null
  xProfileUrl?: string | null
  linkedinProfileUrl?: string | null
  githubProfileUrl?: string | null
  chatgptEmail?: string | null
  openaiOrgId?: string | null
  lumaUsername?: string | null
}

export interface TeamSummaryRecord {
  id: string
  hackathonId: string
  name: string
  bio: string | null
  slug: string
  workspaceMode: 'solo' | 'team'
  isOpenToJoinRequests: boolean
  createdByUserId: string
  createdAt: string
  updatedAt: string
  activeMemberCount?: number
  isPersisted?: boolean
}

export interface TeamMemberRecord {
  id: string
  teamId: string
  userId: string
  role: 'member' | 'admin'
  joinedAt: string
  leftAt: string | null
  createdAt: string
  user?: TeamUserSummary
}

export interface TeamDetailRecord extends TeamSummaryRecord {
  members: TeamMemberRecord[]
}

export interface TeamJoinRequestRecord {
  id: string
  teamId: string
  userId: string
  status: 'pending' | 'approved' | 'rejected' | 'canceled'
  requestedAt: string
  reviewedAt: string | null
  reviewedByUserId: string | null
  createdAt: string
  user?: TeamUserSummary
}

export interface TeamActionAvailability {
  isAllowed: boolean
  reason?: string
}

export interface TeamDirectoryEntry {
  team: TeamSummaryRecord
  detailHref: string | null
  isOwnTeam: boolean
  isFull?: boolean
  hasPendingJoinRequest: boolean
  pendingJoinRequestId: string | null
  joinAvailability: TeamActionAvailability
}

type TeamMembershipCountRecord = Pick<TeamSummaryRecord, 'activeMemberCount'> & {
  members?: Array<Pick<TeamMemberRecord, 'leftAt'>>
}

export function getActiveTeamMemberCount(team: TeamMembershipCountRecord) {
  if (typeof team.activeMemberCount === 'number') {
    return team.activeMemberCount
  }

  return team.members?.filter(member => member.leftAt === null).length ?? 0
}

export function isTeamDissolved(team: TeamMembershipCountRecord) {
  return getActiveTeamMemberCount(team) === 0
}

export function formatJoinAvailabilityReason(
  team: Pick<TeamSummaryRecord, 'workspaceMode'>,
  availability: TeamActionAvailability
) {
  if (!availability.isAllowed && team.workspaceMode === 'solo') {
    return 'Solo teams cannot be joined.'
  }

  return availability.reason
}

export function createTeamWorkspaceFallbackActor(user: ReturnType<typeof useUser>['value']): TeamWorkspaceActor {
  if (!user?.sub) {
    return buildAnonymousParticipantActor()
  }

  return buildAuthenticatedIdentityParticipantActor({
    sub: user.sub,
    email: user.email ?? null,
    name: user.name ?? null,
    nickname: user.nickname ?? null,
    picture: user.picture ?? null
  } satisfies ParticipantSessionUser)
}

export function normalizeTeamWorkspaceApiError(error: unknown) {
  return normalizeParticipantApiError(error)
}

export function getOwnTeamMembership(team: TeamDetailRecord | null | undefined, userId: string | null | undefined) {
  if (!team || !userId) {
    return null
  }

  return team.members.find(member => member.userId === userId && member.leftAt === null) ?? null
}

export function getTeamFormationAvailability(
  hackathon: Pick<PublicHackathon, 'state'>,
  applicationStatus: 'submitted' | 'approved' | 'rejected' | 'withdrawn' | null,
  isTeamMember: boolean
) {
  if (isTeamMember) {
    return {
      isOpen: true,
      summary: 'You already have a team workspace in this hackathon.'
    }
  }

  if (applicationStatus !== 'approved') {
    return {
      isOpen: false,
      summary: applicationStatus === 'submitted'
        ? 'Team formation unlocks only after your application is approved.'
        : applicationStatus === 'rejected'
          ? 'Rejected applicants cannot create or join teams in this hackathon.'
          : applicationStatus === 'withdrawn'
            ? 'Withdrawn participants cannot create or join teams in this hackathon.'
            : 'Team formation requires an approved application for this hackathon.'
    }
  }

  if (hackathon.state === 'registration_open' || hackathon.state === 'submission_open') {
    return {
      isOpen: true,
      summary: 'You can participate as solo, create a team, or browse teams right now.'
    }
  }

  return {
    isOpen: false,
    summary: 'Team formation is closed for this hackathon.'
  }
}

export function getCreateTeamAvailability(
  hackathon: Pick<PublicHackathon, 'state'>,
  applicationStatus: 'submitted' | 'approved' | 'rejected' | 'withdrawn' | null,
  hasTeamMembership: boolean
): TeamActionAvailability {
  if (hasTeamMembership) {
    return {
      isAllowed: false,
      reason: 'You already belong to a team in this hackathon.'
    }
  }

  if (applicationStatus !== 'approved') {
    return {
      isAllowed: false,
      reason: applicationStatus === 'submitted'
        ? 'Only approved applicants can create teams.'
        : applicationStatus === 'rejected'
          ? 'Rejected applicants cannot create teams.'
          : applicationStatus === 'withdrawn'
            ? 'Withdrawn participants cannot create teams.'
            : 'Create-team access requires an approved application.'
    }
  }

  if (hackathon.state !== 'registration_open' && hackathon.state !== 'submission_open') {
    return {
      isAllowed: false,
      reason: 'Teams can be created only while registration or submission is open.'
    }
  }

  return {
    isAllowed: true
  }
}

export function getUpdateJoinPolicyAvailability(
  hackathon: Pick<PublicHackathon, 'state'>,
  canManageTeam: boolean
): TeamActionAvailability {
  if (!canManageTeam) {
    return {
      isAllowed: false,
      reason: 'Only team admins can update join requests.'
    }
  }

  if (hackathon.state !== 'registration_open' && hackathon.state !== 'submission_open') {
    return {
      isAllowed: false,
      reason: 'Join-request settings can be updated only while registration or submission is open.'
    }
  }

  return {
    isAllowed: true
  }
}

export function getJoinTeamAvailability(
  hackathon: Pick<PublicHackathon, 'state' | 'maxTeamMembers'>,
  team: Pick<TeamSummaryRecord, 'id' | 'isOpenToJoinRequests'>,
  options: {
    applicationStatus: 'submitted' | 'approved' | 'rejected' | 'withdrawn' | null
    hasTeamMembership: boolean
    activeMemberCount: number
    hasPendingJoinRequest: boolean
    isOwnTeam: boolean
  }
): TeamActionAvailability {
  if (options.isOwnTeam) {
    return {
      isAllowed: false,
      reason: 'You are already a member of this team.'
    }
  }

  if (options.hasTeamMembership) {
    return {
      isAllowed: false,
      reason: 'You can belong to only one active team per hackathon.'
    }
  }

  if (options.hasPendingJoinRequest) {
    return {
      isAllowed: false,
      reason: 'You already have a pending join request for this team.'
    }
  }

  if (options.applicationStatus !== 'approved') {
    return {
      isAllowed: false,
      reason: options.applicationStatus === 'submitted'
        ? 'Only approved applicants can request to join a team.'
        : options.applicationStatus === 'rejected'
          ? 'Rejected applicants cannot request to join teams.'
          : options.applicationStatus === 'withdrawn'
            ? 'Withdrawn participants cannot request to join teams.'
            : 'Join requests require an approved application.'
    }
  }

  if (hackathon.state !== 'registration_open' && hackathon.state !== 'submission_open') {
    return {
      isAllowed: false,
      reason: 'Join requests are available only while registration or submission is open.'
    }
  }

  if (!team.isOpenToJoinRequests) {
    return {
      isAllowed: false,
      reason: 'This team is not currently open to join requests.'
    }
  }

  if (hasTeamReachedMemberLimit(hackathon.maxTeamMembers, options.activeMemberCount)) {
    return {
      isAllowed: false,
      reason: 'This team has reached the hackathon member limit.'
    }
  }

  return {
    isAllowed: true
  }
}

export function hasTeamReachedMemberLimit(maxTeamMembers: number, activeMemberCount: number) {
  return activeMemberCount >= maxTeamMembers
}

export function getLeaveTeamAvailability(
  hackathon: Pick<PublicHackathon, 'state'>,
  team: TeamDetailRecord,
  membership: TeamMemberRecord | null | undefined,
  options?: {
    hasActiveSubmission?: boolean
  }
): TeamActionAvailability {
  if (!membership) {
    return {
      isAllowed: false,
      reason: 'Only active team members can leave the team.'
    }
  }

  const remainingActiveMembers = team.members.filter(member =>
    member.id !== membership.id
    && member.leftAt === null
  )

  if (remainingActiveMembers.length === 0) {
    if (hackathon.state !== 'registration_open' && hackathon.state !== 'submission_open') {
      return {
        isAllowed: false,
        reason: 'After submission closes, a team must retain at least one active member.'
      }
    }

    if (options?.hasActiveSubmission) {
      return {
        isAllowed: false,
        reason: 'You cannot leave the last active member of a team that still has an active submission.'
      }
    }

    return {
      isAllowed: true
    }
  }

  if (membership.role === 'admin') {
    const otherActiveAdmins = remainingActiveMembers.filter(member =>
      member.role === 'admin'
    )

    if (otherActiveAdmins.length === 0) {
      return {
        isAllowed: false,
        reason: 'Teams must retain at least one active team admin.'
      }
    }
  }

  if (hackathon.state !== 'registration_open' && hackathon.state !== 'submission_open') {
    return {
      isAllowed: true
    }
  }

  return {
    isAllowed: true
  }
}

export function getMemberRemovalAvailability(
  hackathon: Pick<PublicHackathon, 'state'>,
  team: TeamDetailRecord,
  targetMember: TeamMemberRecord | null | undefined
): TeamActionAvailability {
  if (!targetMember) {
    return {
      isAllowed: false,
      reason: 'The selected member is not active on this team.'
    }
  }

  return getLeaveTeamAvailability(hackathon, team, targetMember)
}

export function formatTeamMemberRole(role: TeamMemberRecord['role']) {
  return role === 'admin' ? 'Admin' : 'Member'
}

export function formatTeamJoinRequestStatus(status: TeamJoinRequestRecord['status']) {
  switch (status) {
    case 'pending':
      return 'Pending'
    case 'approved':
      return 'Approved'
    case 'rejected':
      return 'Rejected'
    case 'canceled':
      return 'Canceled'
  }
}

export function getTeamJoinRequestStatusColor(status: TeamJoinRequestRecord['status']) {
  switch (status) {
    case 'pending':
      return 'warning'
    case 'approved':
      return 'success'
    case 'rejected':
      return 'error'
    case 'canceled':
      return 'neutral'
  }
}
