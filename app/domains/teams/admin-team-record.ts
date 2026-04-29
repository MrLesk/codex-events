import type { OperationalUserSummary } from '~/domains/accounts/session-actor'

export interface TeamSummary {
  id: string
  hackathonId: string
  name: string
  bio: string | null
  slug: string
  isOpenToJoinRequests: boolean
  createdByUserId: string
  createdAt: string
  updatedAt: string
  activeMemberCount?: number
}

export interface TeamMemberSummary {
  id: string
  teamId: string
  userId: string
  role: 'member' | 'admin'
  joinedAt: string
  leftAt: string | null
  createdAt: string
  user?: OperationalUserSummary
}

export interface AdminTeamDetailRecord extends TeamSummary {
  members: TeamMemberSummary[]
}
