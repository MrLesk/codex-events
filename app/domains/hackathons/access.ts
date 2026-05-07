import type {
  HackathonRoleSummary,
  SessionActor
} from '~/domains/accounts/session-actor'
import type { HackathonRecord } from '~/domains/hackathons/records'
import type { HackathonScopedRole } from '~/domains/hackathons/roles'

export interface HackathonRoleUserSummary {
  id: string
  email: string
  displayName: string
  isPlatformAdmin: boolean
  isEventOrganizer?: boolean
}

export interface HackathonRoleAssignment {
  id: string
  hackathonId: string
  userId: string
  role: HackathonScopedRole
  isInJudgePool: boolean
  isStaff: boolean
  createdAt: string
  user?: HackathonRoleUserSummary
}

export function isAdminActor(actor: SessionActor | null | undefined) {
  if (!actor?.hasPlatformAccount) {
    return false
  }

  if (actor.isPlatformAdmin || actor.isEventOrganizer) {
    return true
  }

  return actor.hackathonRoles.some(role => role.role === 'hackathon_admin')
}

export function isHackathonRoleJudgingEnabled(
  role: Pick<HackathonRoleSummary, 'role' | 'isInJudgePool'>
) {
  return role.role === 'judge' || (role.role === 'hackathon_admin' && role.isInJudgePool)
}

export function isHackathonRoleStaffEnabled(
  role: Pick<HackathonRoleSummary, 'role' | 'isStaff'>
) {
  return role.role === 'staff' || (role.role === 'hackathon_admin' && role.isStaff)
}

export function canCreateHackathon(actor: SessionActor | null | undefined) {
  return Boolean(actor?.hasPlatformAccount && (actor.isPlatformAdmin || actor.isEventOrganizer))
}

export function canAccessAdminDashboard(actor: SessionActor | null | undefined) {
  return isAdminActor(actor)
}

export function canMutateRoleAssignments(actor: SessionActor | null | undefined) {
  if (!actor?.hasPlatformAccount) {
    return false
  }

  return actor.isPlatformAdmin || actor.hackathonRoles.some(role => role.role === 'hackathon_admin')
}

export function hasHackathonAdminAccess(actor: SessionActor | null | undefined, hackathonId: string) {
  if (!actor?.hasPlatformAccount) {
    return false
  }

  if (actor.isPlatformAdmin) {
    return true
  }

  return actor.hackathonRoles.some(role => role.hackathonId === hackathonId && role.role === 'hackathon_admin')
}

export function hasHackathonParticipantVisibilityAccess(
  actor: SessionActor | null | undefined,
  hackathonId: string
) {
  if (!actor?.hasPlatformAccount) {
    return false
  }

  if (actor.isPlatformAdmin) {
    return true
  }

  return actor.hackathonRoles.some(role =>
    role.hackathonId === hackathonId
    && (role.role === 'hackathon_admin' || role.role === 'staff')
  )
}

export function hasHackathonJudgingAccess(actor: SessionActor | null | undefined, hackathonId: string) {
  if (!actor?.hasPlatformAccount) {
    return false
  }

  return actor.hackathonRoles.some(role =>
    role.hackathonId === hackathonId
    && isHackathonRoleJudgingEnabled(role)
  )
}

export function filterManageableHackathons(hackathons: HackathonRecord[], actor: SessionActor | null | undefined) {
  if (!actor?.hasPlatformAccount) {
    return []
  }

  if (actor.isPlatformAdmin) {
    return [...hackathons]
  }

  const allowedIds = new Set(
    actor.hackathonRoles
      .filter(role => role.role === 'hackathon_admin')
      .map(role => role.hackathonId)
  )

  return hackathons.filter(hackathon => allowedIds.has(hackathon.id))
}
