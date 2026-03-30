import type {
  HackathonRoleAssignment,
  HackathonRoleUserSummary
} from './admin-workspace'
import {
  isHackathonRoleJudgingEnabled,
  isHackathonRoleStaffEnabled
} from './admin-workspace'

export type HackathonRosterRole = 'judge' | 'staff'

export interface HackathonRoleRosterRow extends HackathonRoleUserSummary {
  assignment: HackathonRoleAssignment | null
  isAssigned: boolean
  isHackathonAdmin: boolean
  isInJudgePool: boolean
  isStaff: boolean
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
      isHackathonAdmin: assignment.role === 'hackathon_admin',
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

      return {
        ...user,
        assignment,
        isAssigned: isAssignedToRoster(assignment, role),
        isHackathonAdmin: assignment?.role === 'hackathon_admin',
        isInJudgePool: assignment?.isInJudgePool ?? false,
        isStaff: assignment?.isStaff ?? false
      }
    })
}
