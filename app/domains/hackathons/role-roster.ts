import type {
  HackathonRoleAssignment,
  HackathonRoleUserSummary
} from '~/domains/hackathons/access'
import {
  isHackathonRoleJudgingEnabled,
  isHackathonRoleStaffEnabled
} from '~/domains/hackathons/access'

export type HackathonRosterRole = 'judge' | 'staff' | 'admin'

export interface HackathonRoleRosterRow extends HackathonRoleUserSummary {
  assignment: HackathonRoleAssignment | null
  isAssigned: boolean
  isHackathonAdmin: boolean
  isInJudgePool: boolean
  isStaff: boolean
}

export type HackathonRoleRosterBadge = 'admin' | 'staff' | 'judge' | 'platform_admin'

export function isAdminCapableHackathonUser(
  assignment: HackathonRoleAssignment | null | undefined,
  user?: HackathonRoleUserSummary | null
) {
  return assignment?.role === 'hackathon_admin'
    || assignment?.user?.isPlatformAdmin === true
    || user?.isPlatformAdmin === true
}

export function deriveAdminCapableRoleFlags(
  assignment: HackathonRoleAssignment | null | undefined,
  overrides: Partial<Pick<HackathonRoleAssignment, 'isInJudgePool' | 'isStaff'>> = {}
) {
  const currentIsInJudgePool = assignment?.role === 'judge' || assignment?.isInJudgePool === true
  const currentIsStaff = assignment?.role === 'staff' || assignment?.isStaff === true

  return {
    isInJudgePool: overrides.isInJudgePool ?? currentIsInJudgePool,
    isStaff: overrides.isStaff ?? currentIsStaff
  }
}

export function listHackathonRoleRosterBadges(
  row: Pick<HackathonRoleRosterRow, 'isHackathonAdmin' | 'isStaff' | 'isInJudgePool' | 'isPlatformAdmin'>
) {
  const badges: HackathonRoleRosterBadge[] = []

  if (row.isHackathonAdmin) {
    badges.push('admin')
  }

  if (row.isStaff) {
    badges.push('staff')
  }

  if (row.isInJudgePool) {
    badges.push('judge')
  }

  if (row.isPlatformAdmin) {
    badges.push('platform_admin')
  }

  return badges
}

function compareRosterUsers(
  left: HackathonRoleUserSummary,
  right: HackathonRoleUserSummary,
  currentHackathonAdminIds: Set<string>
) {
  const leftPriority = left.isPlatformAdmin ? 0 : currentHackathonAdminIds.has(left.id) ? 1 : 2
  const rightPriority = right.isPlatformAdmin ? 0 : currentHackathonAdminIds.has(right.id) ? 1 : 2

  if (leftPriority !== rightPriority) {
    return leftPriority - rightPriority
  }

  const displayNameOrder = left.displayName.localeCompare(right.displayName)

  if (displayNameOrder !== 0) {
    return displayNameOrder
  }

  const emailOrder = left.email.localeCompare(right.email)

  if (emailOrder !== 0) {
    return emailOrder
  }

  return left.id.localeCompare(right.id)
}

function listCurrentHackathonAdminIds(roleAssignments: HackathonRoleAssignment[]) {
  return new Set(
    roleAssignments
      .filter(assignment => assignment.role === 'hackathon_admin')
      .map(assignment => assignment.userId)
  )
}

function findRoleAssignment(
  roleAssignments: HackathonRoleAssignment[],
  userId: string
) {
  return roleAssignments.find(assignment => assignment.userId === userId) ?? null
}

function isAssignedToRoster(
  assignment: HackathonRoleAssignment | null,
  role: HackathonRosterRole
) {
  if (!assignment) {
    return false
  }

  if (role === 'admin') {
    return isAdminCapableHackathonUser(assignment)
  }

  if (role === 'staff') {
    return isHackathonRoleStaffEnabled(assignment)
  }

  return isHackathonRoleJudgingEnabled(assignment)
}

export function buildAssignedRoleRosterRows(
  roleAssignments: HackathonRoleAssignment[],
  role: HackathonRosterRole
) {
  const currentHackathonAdminIds = listCurrentHackathonAdminIds(roleAssignments)

  return roleAssignments
    .filter((assignment): assignment is HackathonRoleAssignment & { user: HackathonRoleUserSummary } =>
      isAssignedToRoster(assignment, role) && assignment.user !== undefined
    )
    .map((assignment): HackathonRoleRosterRow => ({
      ...assignment.user,
      assignment,
      isAssigned: true,
      isHackathonAdmin: isAdminCapableHackathonUser(assignment, assignment.user),
      isInJudgePool: assignment.isInJudgePool,
      isStaff: assignment.isStaff
    }))
    .sort((left, right) => compareRosterUsers(left, right, currentHackathonAdminIds))
}

export function buildRoleRosterRows(
  candidateUsers: HackathonRoleUserSummary[],
  roleAssignments: HackathonRoleAssignment[],
  role: HackathonRosterRole,
  query: string
) {
  const normalizedQuery = query.trim().toLowerCase()
  const currentHackathonAdminIds = listCurrentHackathonAdminIds(roleAssignments)

  return [...candidateUsers].filter((user) => {
    if (!normalizedQuery) {
      return true
    }

    const haystack = `${user.displayName} ${user.email} ${user.id}`.toLowerCase()
    return haystack.includes(normalizedQuery)
  })
    .sort((left, right) => compareRosterUsers(left, right, currentHackathonAdminIds))
    .map((user): HackathonRoleRosterRow => {
      const assignment = findRoleAssignment(roleAssignments, user.id)
      const isHackathonAdmin = isAdminCapableHackathonUser(assignment, user)

      return {
        ...user,
        assignment,
        isAssigned: role === 'admin'
          ? isHackathonAdmin
          : isAssignedToRoster(assignment, role),
        isHackathonAdmin,
        isInJudgePool: assignment?.isInJudgePool ?? false,
        isStaff: assignment?.isStaff ?? false
      }
    })
}
